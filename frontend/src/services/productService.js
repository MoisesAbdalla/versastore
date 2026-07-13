import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import db from "../firebase/firestore";
import { PRODUCT_STATUS, DEFAULT_LOW_STOCK_THRESHOLD } from "../constants/product";
import { normalizeForSearch } from "../utils/slugify";

const PAGE_SIZE = 20;

// Ordenações limitadas às combinações com índice composto (research R-8).
const SORTABLE_FIELDS = ["createdAt", "price", "totalStock", "nameLower"];

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toItem(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

// Critério ÚNICO de "cadastro incompleto" (alerta da visão geral, FR-014):
// exatamente os campos que o formulário exige para publicar (status ativo) +
// descrição vazia ("descrição incompleta" da spec). Campos opcionais (marca,
// tags, promoção, categoria) NUNCA entram aqui. Compartilhado com o backfill.
export function computeIncompleteFields(data) {
  const fields = [];

  if (!data.name || !String(data.name).trim()) {
    fields.push("sem nome");
  }

  if (data.price == null || data.price <= 0) {
    fields.push("sem preço");
  }

  const hasImage = (data.images || []).length > 0 || Boolean(data.image);

  if (!hasImage) {
    fields.push("sem foto");
  }

  const hasStock =
    (data.variations || []).length > 0 ||
    (data.stock !== null && data.stock !== undefined && data.stock !== "");

  if (!hasStock) {
    fields.push("sem estoque definido");
  }

  if (!stripHtml(data.description)) {
    fields.push("sem descrição");
  }

  return fields;
}

// Campos derivados gravados em todo create/update (contracts/services.md).
// Também normaliza produtos legados: garante deleted/status/totalStock presentes.
function withDerivedFields(data) {
  const variations = data.variations || [];
  const images = data.images || [];
  const mainImage = images.find((img) => img.isMain) || images[0];
  const descriptionText = stripHtml(data.description);

  const totalStock = variations.length
    ? variations.reduce((sum, variation) => sum + (Number(variation.stock) || 0), 0)
    : Number(data.stock) || 0;

  // Flag derivada p/ alerta "produto incompleto" (FR-014) — recalculada em
  // TODO save via computeIncompleteFields (critério = campos de publicação).
  const incompleteFields = computeIncompleteFields(data);

  return {
    ...data,
    variations,
    images,
    nameLower: normalizeForSearch(data.name),
    skuUpper: (data.sku || "").trim().toUpperCase(),
    descriptionText,
    incomplete: incompleteFields.length > 0,
    incompleteFields,
    totalStock,
    variationSkus: variations.map((variation) => (variation.sku || "").trim().toUpperCase()),
    // Campo legado `image` mantido em sincronia com a imagem principal (loja atual).
    image: mainImage ? mainImage.url : data.image || "",
    deleted: data.deleted ?? false,
    deletedAt: data.deletedAt ?? null,
    status: data.status || PRODUCT_STATUS.RASCUNHO,
    lowStockThreshold: data.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    destaque: data.destaque ?? false,
    updatedAt: serverTimestamp(),
  };
}

function validateProduct(data) {
  const { promoPrice, promoStart, promoEnd, price } = data;

  if (promoPrice != null) {
    if (price != null && promoPrice >= price) {
      throw serviceError("promocao-invalida", "O preço promocional deve ser menor que o preço normal.");
    }

    if (promoStart && promoEnd) {
      const start = promoStart.toDate ? promoStart.toDate() : new Date(promoStart);
      const end = promoEnd.toDate ? promoEnd.toDate() : new Date(promoEnd);

      if (end <= start) {
        throw serviceError("promocao-invalida", "A data de fim da promoção deve ser depois da data de início.");
      }
    }
  }

  if (data.status === PRODUCT_STATUS.ATIVO) {
    const missing = [];

    if (!data.name || !data.name.trim()) missing.push("nome");
    if (data.price == null || data.price <= 0) missing.push("preço");
    if (!(data.images || []).length && !data.image) missing.push("ao menos uma imagem");

    const hasStock =
      (data.variations || []).length > 0 || data.stock !== null && data.stock !== undefined && data.stock !== "";

    if (!hasStock) missing.push("estoque definido");

    if (missing.length) {
      throw serviceError(
        "publicacao-incompleta",
        `Para publicar o produto, preencha: ${missing.join(", ")}. Você pode salvar como rascunho.`
      );
    }
  }

  const variationSkus = (data.variations || []).map((v) => (v.sku || "").trim().toUpperCase());
  const uniqueSkus = new Set(variationSkus.filter(Boolean));

  if (uniqueSkus.size !== variationSkus.filter(Boolean).length) {
    throw serviceError("sku-duplicado", "Há SKUs repetidos entre as variações deste produto.");
  }
}

// SKU único no catálogo inteiro: cobre o campo `sku` dos produtos e o array
// derivado `variationSkus` (data-model.md).
export async function checkSkuAvailable(sku, { ignoreProductId } = {}) {
  const skuUpper = (sku || "").trim().toUpperCase();

  if (!skuUpper) {
    return true;
  }

  const [bySku, byVariation] = await Promise.all([
    getDocs(query(collection(db, "products"), where("skuUpper", "==", skuUpper), limit(2))),
    getDocs(query(collection(db, "products"), where("variationSkus", "array-contains", skuUpper), limit(2))),
  ]);

  const conflicts = [...bySku.docs, ...byVariation.docs].filter(
    (docSnap) => docSnap.id !== ignoreProductId
  );

  return conflicts.length === 0;
}

async function assertSkusAvailable(data, ignoreProductId) {
  const skus = [
    (data.sku || "").trim(),
    ...(data.variations || []).map((v) => (v.sku || "").trim()),
  ].filter(Boolean);

  for (const sku of skus) {
    const available = await checkSkuAvailable(sku, { ignoreProductId });

    if (!available) {
      throw serviceError("sku-duplicado", `O SKU "${sku}" já está em uso em outro produto.`);
    }
  }
}

export async function createProduct(product) {
  const data = withDerivedFields(product);

  validateProduct(data);
  await assertSkusAvailable(data);

  const ref = await addDoc(collection(db, "products"), {
    ...data,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateProduct(id, changes) {
  const snapshot = await getDoc(doc(db, "products", id));

  if (!snapshot.exists()) {
    throw serviceError("nao-encontrado", "Produto não encontrado.");
  }

  // Merge com o doc atual re-deriva tudo — inclusive a normalização de
  // produtos legados na primeira edição (deleted/status/totalStock ausentes).
  const merged = withDerivedFields({ ...snapshot.data(), ...changes });

  validateProduct(merged);
  await assertSkusAvailable(merged, id);

  await updateDoc(doc(db, "products", id), merged);
}

export async function getProduct(id) {
  const snapshot = await getDoc(doc(db, "products", id));

  return snapshot.exists() ? toItem(snapshot) : null;
}

async function hasOrders(productId) {
  const snapshot = await getDocs(
    query(collection(db, "orders"), where("productIds", "array-contains", productId), limit(1))
  );

  return !snapshot.empty;
}

// Soft delete quando há pedidos associados (preserva histórico); exclusão
// física quando não há (research R-7).
export async function deleteProduct(id) {
  const withOrders = await hasOrders(id);

  if (withOrders) {
    await updateDoc(doc(db, "products", id), {
      deleted: true,
      deletedAt: serverTimestamp(),
    });

    return { soft: true };
  }

  await deleteDoc(doc(db, "products", id));

  return { soft: false };
}

export async function duplicateProduct(id) {
  const original = await getProduct(id);

  if (!original) {
    throw serviceError("nao-encontrado", "Produto não encontrado.");
  }

  const copy = { ...original };
  delete copy.id;

  const data = withDerivedFields({
    ...copy,
    name: `${original.name} (cópia)`,
    sku: "",
    variations: (original.variations || []).map((variation) => ({ ...variation, sku: "" })),
    status: PRODUCT_STATUS.RASCUNHO,
    destaque: false,
    deleted: false,
    deletedAt: null,
  });

  const ref = await addDoc(collection(db, "products"), {
    ...data,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function bulkUpdateProducts(ids, changes) {
  const batch = writeBatch(db);

  for (const id of ids) {
    batch.update(doc(db, "products", id), { ...changes, updatedAt: serverTimestamp() });
  }

  await batch.commit();
}

export async function bulkDeleteProducts(ids) {
  const softIds = [];
  const hardIds = [];

  for (const id of ids) {
    if (await hasOrders(id)) {
      softIds.push(id);
    } else {
      hardIds.push(id);
    }
  }

  const batch = writeBatch(db);

  for (const id of softIds) {
    batch.update(doc(db, "products", id), { deleted: true, deletedAt: serverTimestamp() });
  }

  for (const id of hardIds) {
    batch.delete(doc(db, "products", id));
  }

  await batch.commit();

  return { softIds, hardIds };
}

// Busca por prefixo em nome E SKU em paralelo, mesclando por id (research R-5).
// Busca textual não pagina nem combina com outros filtros (limitação documentada:
// Firestore permite um único campo de range por consulta).
async function searchProducts(term, pageSize) {
  const nameTerm = normalizeForSearch(term);
  const skuTerm = term.trim().toUpperCase();
  const col = collection(db, "products");

  const [byName, bySku] = await Promise.all([
    getDocs(
      query(
        col,
        where("deleted", "==", false),
        where("nameLower", ">=", nameTerm),
        where("nameLower", "<=", `${nameTerm}`),
        limit(pageSize)
      )
    ),
    getDocs(
      query(
        col,
        where("deleted", "==", false),
        where("skuUpper", ">=", skuTerm),
        where("skuUpper", "<=", `${skuTerm}`),
        limit(pageSize)
      )
    ),
  ]);

  const merged = new Map();

  for (const docSnap of [...byName.docs, ...bySku.docs]) {
    merged.set(docSnap.id, toItem(docSnap));
  }

  return {
    items: [...merged.values()].slice(0, pageSize),
    nextCursor: null,
    hasMore: false,
  };
}

export async function listProducts({
  search = "",
  categoryId = "",
  status = "",
  stockRange = "",
  sort = null,
  pageSize = PAGE_SIZE,
  cursor = null,
} = {}) {
  if (search.trim()) {
    return searchProducts(search, pageSize);
  }

  const constraints = [where("deleted", "==", false)];

  if (categoryId) {
    constraints.push(where("categoryId", "==", categoryId));
  }

  if (status) {
    constraints.push(where("status", "==", status));
  }

  // Categoria, status e estoque são combináveis (igualdades + no máximo um
  // range em totalStock) — cada combinação tem índice composto declarado em
  // firestore.indexes.json. Com "estoque baixo" (range), a ordenação é
  // forçada para totalStock; nas demais, a coluna escolhida ordena.
  // Matriz completa de combinações: research.md R-5a.
  let orderField = "createdAt";
  let orderDirection = "desc";

  if (stockRange === "zerado") {
    constraints.push(where("totalStock", "==", 0));
  } else if (stockRange === "baixo") {
    constraints.push(where("totalStock", ">", 0));
    constraints.push(where("totalStock", "<=", DEFAULT_LOW_STOCK_THRESHOLD));
    orderField = "totalStock";
    orderDirection = "asc";
  }

  if (sort && SORTABLE_FIELDS.includes(sort.key) && !stockRange) {
    orderField = sort.key;
    orderDirection = sort.direction === "asc" ? "asc" : "desc";
  }

  constraints.push(orderBy(orderField, orderDirection));

  let cursorSnap = cursor;

  if (typeof cursor === "string") {
    cursorSnap = await getDoc(doc(db, "products", cursor));

    if (!cursorSnap.exists()) {
      cursorSnap = null;
    }
  }

  if (cursorSnap) {
    constraints.push(startAfter(cursorSnap));
  }

  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(collection(db, "products"), ...constraints));
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    items: docs.map(toItem),
    nextCursor: docs.length ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
}

// Consulta pública da Home: os três filtros são obrigatórios para satisfazer a
// rule de leitura anônima (status == "ativo" && deleted == false — T030a).
export async function getFeaturedProducts() {
  const featuredQuery = query(
    collection(db, "products"),
    where("destaque", "==", true),
    where("deleted", "==", false),
    where("status", "==", PRODUCT_STATUS.ATIVO)
  );

  const snapshot = await getDocs(featuredQuery);

  return snapshot.docs.map(toItem);
}

// ---------------------------------------------------------------------------
// Leituras PÚBLICAS da vitrine (feature 005). Sempre forçam ativo + não
// excluído — a barreira das rules já nega inativos ao público, e estas
// funções nunca os pedem (senão a rule negaria e a listagem quebraria).
// ---------------------------------------------------------------------------

const PUBLIC_SORTS = {
  recentes: { field: "createdAt", direction: "desc" },
  "preco-asc": { field: "price", direction: "asc" },
  "preco-desc": { field: "price", direction: "desc" },
  "nome-asc": { field: "nameLower", direction: "asc" },
  "nome-desc": { field: "nameLower", direction: "desc" },
};

export async function listPublicProducts({
  categoryId = "",
  sort = "recentes",
  search = "",
  cursor = null,
  pageSize = 20,
} = {}) {
  const constraints = [
    where("deleted", "==", false),
    where("status", "==", PRODUCT_STATUS.ATIVO),
  ];

  if (categoryId) {
    constraints.push(where("categoryId", "==", categoryId));
  }

  const term = normalizeForSearch(search);

  if (term) {
    // Busca compõe com categoria (índice N2); durante busca, ordena por
    // recentes (array-contains + orderBy(price) exigiria índice por ordenação
    // — fora do escopo M1, FR-013/R-9).
    constraints.push(where("searchKeywords", "array-contains", term));
    constraints.push(orderBy("createdAt", "desc"));
  } else {
    const chosen = PUBLIC_SORTS[sort] || PUBLIC_SORTS.recentes;
    constraints.push(orderBy(chosen.field, chosen.direction));
  }

  let cursorSnap = cursor;

  if (typeof cursor === "string") {
    cursorSnap = await getDoc(doc(db, "products", cursor));

    if (!cursorSnap.exists()) {
      cursorSnap = null;
    }
  }

  if (cursorSnap) {
    constraints.push(startAfter(cursorSnap));
  }

  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(collection(db, "products"), ...constraints));
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    items: docs.map(toItem),
    nextCursor: docs.length ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
}

// Leitura pública de um produto: null se inexistente, inativo, excluído ou se
// as rules negarem a leitura (permission-denied) — para 404 sem vazar a
// existência (SC-002). Erro de rede real propaga para a UI tratar.
export async function getPublicProduct(id) {
  let snapshot;

  try {
    snapshot = await getDoc(doc(db, "products", id));
  } catch (error) {
    if (error?.code === "permission-denied") {
      return null;
    }

    throw error;
  }

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  if (data.deleted || data.status !== PRODUCT_STATUS.ATIVO) {
    return null;
  }

  return { id: snapshot.id, ...data };
}
