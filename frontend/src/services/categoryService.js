import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import db from "../firebase/firestore";
import { slugify, normalizeForSearch } from "../utils/slugify";

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toItem(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

// Coleção pequena (contrato): leitura única, árvore de 2 níveis montada no
// cliente — raízes com `children` ordenadas por nome.
export async function listCategories() {
  const snapshot = await getDocs(collection(db, "categories"));
  const all = snapshot.docs.map(toItem);

  const roots = all
    .filter((category) => !category.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  for (const root of roots) {
    root.children = all
      .filter((category) => category.parentId === root.id)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  return roots;
}

async function assertSlugAvailable(slug, ignoreId) {
  const snapshot = await getDocs(
    query(collection(db, "categories"), where("slug", "==", slug), limit(2))
  );

  const conflict = snapshot.docs.find((docSnap) => docSnap.id !== ignoreId);

  if (conflict) {
    throw serviceError("slug-duplicado", `Já existe uma categoria com o slug "${slug}".`);
  }
}

// Hierarquia máxima de 2 níveis (FR-041): o pai precisa ser raiz.
async function assertValidParent(parentId) {
  if (!parentId) {
    return;
  }

  const parent = await getDoc(doc(db, "categories", parentId));

  if (!parent.exists()) {
    throw serviceError("nao-encontrado", "Categoria pai não encontrada.");
  }

  if (parent.data().parentId) {
    throw serviceError(
      "hierarquia-invalida",
      "Subcategorias não podem ter subcategorias (máximo de 2 níveis)."
    );
  }
}

async function hasSubcategories(id) {
  const snapshot = await getDocs(
    query(collection(db, "categories"), where("parentId", "==", id), limit(1))
  );

  return !snapshot.empty;
}

async function hasProducts(id) {
  const snapshot = await getDocs(
    query(
      collection(db, "products"),
      where("categoryId", "==", id),
      where("deleted", "==", false),
      limit(1)
    )
  );

  return !snapshot.empty;
}

export async function createCategory({ name, slug, description = "", image = "", parentId = null }) {
  const finalSlug = slugify(slug || name);

  if (!name || !name.trim() || !finalSlug) {
    throw serviceError("nome-obrigatorio", "Informe o nome da categoria.");
  }

  await assertValidParent(parentId);
  await assertSlugAvailable(finalSlug);

  const ref = await addDoc(collection(db, "categories"), {
    name: name.trim(),
    nameLower: normalizeForSearch(name),
    slug: finalSlug,
    description: description || null,
    image: image || null,
    parentId: parentId || null,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateCategory(id, changes) {
  const snapshot = await getDoc(doc(db, "categories", id));

  if (!snapshot.exists()) {
    throw serviceError("nao-encontrado", "Categoria não encontrada.");
  }

  const current = snapshot.data();
  const merged = { ...current, ...changes };
  const finalSlug = slugify(changes.slug || merged.slug || merged.name);

  // Virar subcategoria tendo filhos criaria um 3º nível.
  if (changes.parentId && (await hasSubcategories(id))) {
    throw serviceError(
      "hierarquia-invalida",
      "Esta categoria tem subcategorias e não pode virar subcategoria."
    );
  }

  if (changes.parentId === id) {
    throw serviceError("hierarquia-invalida", "Uma categoria não pode ser pai de si mesma.");
  }

  if (changes.parentId !== undefined) {
    await assertValidParent(changes.parentId);
  }

  if (finalSlug !== current.slug) {
    await assertSlugAvailable(finalSlug, id);
  }

  await updateDoc(doc(db, "categories", id), {
    ...changes,
    name: merged.name.trim(),
    nameLower: normalizeForSearch(merged.name),
    slug: finalSlug,
  });

  // Nome desnormalizado nos produtos (categoryName) acompanha o rename.
  if (changes.name && changes.name !== current.name) {
    const products = await getDocs(
      query(collection(db, "products"), where("categoryId", "==", id))
    );

    if (!products.empty) {
      const batch = writeBatch(db);

      for (const productSnap of products.docs) {
        batch.update(doc(db, "products", productSnap.id), {
          categoryName: merged.name.trim(),
          category: merged.name.trim(),
        });
      }

      await batch.commit();
    }
  }
}

export async function deleteCategory(id) {
  if (await hasSubcategories(id)) {
    throw serviceError(
      "categoria-com-subcategorias",
      "Exclua ou mova as subcategorias antes de excluir esta categoria."
    );
  }

  if (await hasProducts(id)) {
    throw serviceError(
      "categoria-com-produtos",
      "Esta categoria possui produtos. Mova-os para outra categoria antes de excluir."
    );
  }

  await deleteDoc(doc(db, "categories", id));
}

// Move todos os produtos de uma categoria para outra (fluxo de exclusão,
// FR-042), atualizando também o nome desnormalizado.
export async function moveProducts(fromCategoryId, toCategoryId) {
  const target = await getDoc(doc(db, "categories", toCategoryId));

  if (!target.exists()) {
    throw serviceError("nao-encontrado", "Categoria de destino não encontrada.");
  }

  const products = await getDocs(
    query(collection(db, "products"), where("categoryId", "==", fromCategoryId))
  );

  if (products.empty) {
    return 0;
  }

  const batch = writeBatch(db);
  const targetName = target.data().name;

  for (const productSnap of products.docs) {
    batch.update(doc(db, "products", productSnap.id), {
      categoryId: toCategoryId,
      categoryName: targetName,
      category: targetName,
    });
  }

  await batch.commit();

  return products.docs.length;
}
