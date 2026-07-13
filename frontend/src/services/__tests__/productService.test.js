import { describe, it, expect, vi, beforeEach } from "vitest";

const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const deleteDocMock = vi.fn();
const getDocMock = vi.fn();
const getDocsMock = vi.fn();
const batchUpdateMock = vi.fn();
const batchDeleteMock = vi.fn();
const batchCommitMock = vi.fn();

const whereMock = vi.fn((field, op, value) => ({ type: "where", field, op, value }));
const orderByMock = vi.fn((field, direction) => ({ type: "orderBy", field, direction }));
const limitMock = vi.fn((n) => ({ type: "limit", n }));
const queryMock = vi.fn((col, ...constraints) => ({ col, constraints }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args) => addDocMock(...args),
  collection: vi.fn((db, name) => ({ collectionName: name })),
  deleteDoc: (...args) => deleteDocMock(...args),
  doc: vi.fn((db, collectionName, id) => ({ collectionName, id })),
  getDoc: (...args) => getDocMock(...args),
  getDocs: (...args) => getDocsMock(...args),
  limit: (...args) => limitMock(...args),
  orderBy: (...args) => orderByMock(...args),
  query: (...args) => queryMock(...args),
  startAfter: vi.fn((snap) => ({ type: "startAfter", snap })),
  updateDoc: (...args) => updateDocMock(...args),
  where: (...args) => whereMock(...args),
  writeBatch: vi.fn(() => ({
    update: batchUpdateMock,
    delete: batchDeleteMock,
    commit: batchCommitMock,
  })),
  serverTimestamp: () => "server-timestamp",
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import {
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  listProducts,
  getFeaturedProducts,
  checkSkuAvailable,
  computeIncompleteFields,
  listPublicProducts,
  getPublicProduct,
} from "../productService";

function emptySnapshot() {
  return { empty: true, docs: [] };
}

function snapshotWith(docs) {
  return { empty: docs.length === 0, docs };
}

function fakeDoc(id, data) {
  return { id, data: () => data, exists: () => true };
}

const validProduct = {
  name: "Tênis Nike Air Max",
  description: "<p>Confortável e <b>durável</b></p>",
  categoryId: "cat-1",
  categoryName: "Calçados",
  sku: "NIKE-001",
  price: 19990,
  stock: 10,
  images: [{ url: "https://img/1.jpg", publicId: "p1", isMain: true }],
  status: "ativo",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Sem conflitos de SKU e sem pedidos associados, por padrão.
  getDocsMock.mockResolvedValue(emptySnapshot());
});

describe("createProduct — derivações", () => {
  it("grava campos derivados: nameLower, skuUpper, descriptionText, image legado e deleted=false", async () => {
    addDocMock.mockResolvedValueOnce({ id: "novo-id" });

    await createProduct(validProduct);

    const [, data] = addDocMock.mock.calls[0];

    expect(data.nameLower).toBe("tenis nike air max");
    expect(data.skuUpper).toBe("NIKE-001");
    expect(data.descriptionText).toBe("Confortável e durável");
    expect(data.image).toBe("https://img/1.jpg");
    expect(data.deleted).toBe(false);
    expect(data.totalStock).toBe(10);
    expect(data.createdAt).toBe("server-timestamp");
  });

  it("com variações, totalStock soma os estoques e variationSkus é derivado", async () => {
    addDocMock.mockResolvedValueOnce({ id: "novo-id" });

    await createProduct({
      ...validProduct,
      variations: [
        { id: "v1", attributes: { tamanho: "M" }, sku: "NIKE-001-M", stock: 3 },
        { id: "v2", attributes: { tamanho: "G" }, sku: "NIKE-001-G", stock: 4 },
      ],
    });

    const [, data] = addDocMock.mock.calls[0];

    expect(data.totalStock).toBe(7);
    expect(data.variationSkus).toEqual(["NIKE-001-M", "NIKE-001-G"]);
  });
});

describe("createProduct — validações", () => {
  it("bloqueia SKU já usado por outro produto", async () => {
    getDocsMock.mockResolvedValue(snapshotWith([fakeDoc("outro-produto", {})]));

    await expect(createProduct(validProduct)).rejects.toMatchObject({ code: "sku-duplicado" });
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it("bloqueia promoção com fim antes do início", async () => {
    await expect(
      createProduct({
        ...validProduct,
        promoPrice: 9990,
        promoStart: new Date("2026-08-10"),
        promoEnd: new Date("2026-08-01"),
      })
    ).rejects.toMatchObject({ code: "promocao-invalida" });
  });

  it("bloqueia preço promocional maior ou igual ao preço normal", async () => {
    await expect(
      createProduct({ ...validProduct, promoPrice: 19990 })
    ).rejects.toMatchObject({ code: "promocao-invalida" });
  });

  it("bloqueia publicação (status ativo) sem imagem, mas permite rascunho", async () => {
    await expect(
      createProduct({ ...validProduct, images: [], image: "" })
    ).rejects.toMatchObject({ code: "publicacao-incompleta" });

    addDocMock.mockResolvedValueOnce({ id: "rascunho-id" });

    await expect(
      createProduct({ ...validProduct, images: [], image: "", status: "rascunho" })
    ).resolves.toBe("rascunho-id");
  });

  it("bloqueia SKUs repetidos entre variações do mesmo produto", async () => {
    await expect(
      createProduct({
        ...validProduct,
        variations: [
          { id: "v1", sku: "DUP-1", stock: 1 },
          { id: "v2", sku: "DUP-1", stock: 2 },
        ],
      })
    ).rejects.toMatchObject({ code: "sku-duplicado" });
  });
});

describe("updateProduct — normalização de legado", () => {
  it("preenche deleted/status/totalStock ausentes em produto legado na primeira edição", async () => {
    getDocMock.mockResolvedValueOnce(
      fakeDoc("legado-1", {
        name: "Jaqueta Adidas",
        category: "Masculino",
        price: 29990,
        stock: 5,
        description: "Jaqueta",
        image: "https://img/velha.jpg",
        destaque: true,
      })
    );
    updateDocMock.mockResolvedValueOnce(undefined);

    await updateProduct("legado-1", { stock: 8 });

    const [, merged] = updateDocMock.mock.calls[0];

    expect(merged.deleted).toBe(false);
    expect(merged.status).toBe("rascunho");
    expect(merged.totalStock).toBe(8);
    expect(merged.nameLower).toBe("jaqueta adidas");
    expect(merged.destaque).toBe(true);
    expect(merged.image).toBe("https://img/velha.jpg");
  });

  it("falha com nao-encontrado quando o produto não existe", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });

    await expect(updateProduct("fantasma", { stock: 1 })).rejects.toMatchObject({
      code: "nao-encontrado",
    });
  });
});

describe("deleteProduct — soft vs. física (R-7)", () => {
  it("soft delete quando o produto tem pedidos associados", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("pedido-1", {})]));
    updateDocMock.mockResolvedValueOnce(undefined);

    const result = await deleteProduct("prod-com-pedidos");

    expect(result).toEqual({ soft: true });
    expect(updateDocMock).toHaveBeenCalledWith(
      { collectionName: "products", id: "prod-com-pedidos" },
      { deleted: true, deletedAt: "server-timestamp" }
    );
    expect(deleteDocMock).not.toHaveBeenCalled();
  });

  it("exclusão física quando não há pedidos", async () => {
    getDocsMock.mockResolvedValueOnce(emptySnapshot());
    deleteDocMock.mockResolvedValueOnce(undefined);

    const result = await deleteProduct("prod-sem-pedidos");

    expect(result).toEqual({ soft: false });
    expect(deleteDocMock).toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

describe("duplicateProduct", () => {
  it("cria cópia em rascunho com SKU vazio e sem destaque", async () => {
    getDocMock.mockResolvedValueOnce(
      fakeDoc("original", { ...validProduct, destaque: true })
    );
    addDocMock.mockResolvedValueOnce({ id: "copia-id" });

    const newId = await duplicateProduct("original");

    expect(newId).toBe("copia-id");

    const [, data] = addDocMock.mock.calls[0];

    expect(data.name).toBe("Tênis Nike Air Max (cópia)");
    expect(data.sku).toBe("");
    expect(data.status).toBe("rascunho");
    expect(data.destaque).toBe(false);
    expect(data.id).toBeUndefined();
  });
});

describe("cadastro incompleto (alerta da visão geral, FR-014)", () => {
  it("produto completo SEM opcionais (marca, tags, promoção) não alerta", async () => {
    addDocMock.mockResolvedValueOnce({ id: "id-1" });

    // Descrição curta é válida — o critério é ausência, não tamanho.
    await createProduct({
      name: "teste",
      description: "<p>teste</p>",
      sku: "TESTE-1",
      price: 1990,
      stock: 3,
      images: [{ url: "https://img/t.jpg", publicId: "t", isMain: true }],
      status: "ativo",
    });

    const [, data] = addDocMock.mock.calls[0];

    expect(data.incomplete).toBe(false);
    expect(data.incompleteFields).toEqual([]);
  });

  it("aponta exatamente o que falta", () => {
    expect(computeIncompleteFields({ name: "Só nome" })).toEqual([
      "sem preço",
      "sem foto",
      "sem estoque definido",
      "sem descrição",
    ]);

    expect(
      computeIncompleteFields({
        name: "Sem descrição",
        price: 1000,
        image: "https://img/x.jpg",
        stock: 1,
        description: "",
      })
    ).toEqual(["sem descrição"]);
  });

  it("re-salvar o produto recalcula a flag (some do alerta após completar)", async () => {
    getDocMock.mockResolvedValueOnce(
      fakeDoc("p1", {
        name: "teste",
        price: 1990,
        stock: 3,
        image: "https://img/t.jpg",
        description: "",
        deleted: false,
        status: "ativo",
        incomplete: true,
        incompleteFields: ["sem descrição"],
      })
    );
    updateDocMock.mockResolvedValueOnce(undefined);

    await updateProduct("p1", { description: "<p>Agora tem descrição</p>" });

    const [, merged] = updateDocMock.mock.calls[0];

    expect(merged.incomplete).toBe(false);
    expect(merged.incompleteFields).toEqual([]);
  });
});

describe("listProducts — filtro de excluídos sempre presente", () => {
  it("toda listagem filtra deleted == false", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("p1", { name: "A" })]));

    await listProducts({ status: "ativo" });

    expect(whereMock).toHaveBeenCalledWith("deleted", "==", false);
    expect(whereMock).toHaveBeenCalledWith("status", "==", "ativo");
  });

  it("combina categoria + status + estoque na mesma consulta (research R-5a)", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([]));

    await listProducts({ categoryId: "cat-1", status: "ativo", stockRange: "baixo" });

    expect(whereMock).toHaveBeenCalledWith("deleted", "==", false);
    expect(whereMock).toHaveBeenCalledWith("categoryId", "==", "cat-1");
    expect(whereMock).toHaveBeenCalledWith("status", "==", "ativo");
    expect(whereMock).toHaveBeenCalledWith("totalStock", ">", 0);
    expect(whereMock).toHaveBeenCalledWith("totalStock", "<=", 5);
    // Range em totalStock exige ordenação primária pelo mesmo campo.
    expect(orderByMock).toHaveBeenCalledWith("totalStock", "asc");
  });

  it("pagina com limit(pageSize + 1) e reporta hasMore", async () => {
    const docs = Array.from({ length: 21 }, (_, i) => fakeDoc(`p${i}`, { name: `P${i}` }));
    getDocsMock.mockResolvedValueOnce(snapshotWith(docs));

    const result = await listProducts({});

    expect(limitMock).toHaveBeenCalledWith(21);
    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor.id).toBe("p19");
  });

  it("busca textual consulta prefixo de nome e SKU e mescla resultados", async () => {
    getDocsMock
      .mockResolvedValueOnce(snapshotWith([fakeDoc("p1", { name: "Tênis A" })]))
      .mockResolvedValueOnce(snapshotWith([fakeDoc("p1", { name: "Tênis A" }), fakeDoc("p2", { name: "Outro" })]));

    const result = await listProducts({ search: "tênis" });

    expect(result.items).toHaveLength(2);
    expect(whereMock).toHaveBeenCalledWith("nameLower", ">=", "tenis");
    expect(whereMock).toHaveBeenCalledWith("skuUpper", ">=", "TÊNIS");
  });
});

describe("listPublicProducts (vitrine, feature 005)", () => {
  it("sempre força deleted==false E status==ativo", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("p1", { name: "A" })]));

    await listPublicProducts({});

    expect(whereMock).toHaveBeenCalledWith("deleted", "==", false);
    expect(whereMock).toHaveBeenCalledWith("status", "==", "ativo");
  });

  it("uma categoria usa igualdade; busca compõe com ela", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([]));

    await listPublicProducts({ search: "Camisa", categoryIds: ["cat-1"] });

    expect(whereMock).toHaveBeenCalledWith("categoryId", "==", "cat-1");
    expect(whereMock).toHaveBeenCalledWith("searchKeywords", "array-contains", "camisa");
    expect(orderByMock).toHaveBeenCalledWith("createdAt", "desc");
  });

  it("várias categorias (raiz + filhas) usam `in` (hierarquia, FR-003)", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([]));

    await listPublicProducts({ categoryIds: ["raiz", "filha-1", "filha-2"] });

    expect(whereMock).toHaveBeenCalledWith("categoryId", "in", ["raiz", "filha-1", "filha-2"]);
  });

  it("sem categoria não filtra por categoryId", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([]));

    await listPublicProducts({ categoryIds: [] });

    const categoryCall = whereMock.mock.calls.find((c) => c[0] === "categoryId");
    expect(categoryCall).toBeUndefined();
  });

  it("ordenação por preço fora de busca", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([]));

    await listPublicProducts({ sort: "preco-asc" });

    expect(orderByMock).toHaveBeenCalledWith("price", "asc");
  });

  it("pagina com limit(pageSize + 1) e reporta hasMore", async () => {
    const docs = Array.from({ length: 21 }, (_, i) => fakeDoc(`p${i}`, { name: `P${i}` }));
    getDocsMock.mockResolvedValueOnce(snapshotWith(docs));

    const result = await listPublicProducts({ pageSize: 20 });

    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });
});

describe("getPublicProduct (vitrine)", () => {
  it("retorna o produto quando ativo e não excluído", async () => {
    getDocMock.mockResolvedValueOnce(
      fakeDoc("p1", { name: "Ativo", status: "ativo", deleted: false })
    );

    const product = await getPublicProduct("p1");

    expect(product.name).toBe("Ativo");
  });

  it("retorna null para produto inativo (404 sem vazar — SC-002)", async () => {
    getDocMock.mockResolvedValueOnce(
      fakeDoc("p1", { name: "Rascunho", status: "rascunho", deleted: false })
    );

    expect(await getPublicProduct("p1")).toBe(null);
  });

  it("retorna null para produto inexistente", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });

    expect(await getPublicProduct("fantasma")).toBe(null);
  });

  it("retorna null quando as rules negam a leitura (permission-denied)", async () => {
    getDocMock.mockRejectedValueOnce({ code: "permission-denied" });

    expect(await getPublicProduct("inativo")).toBe(null);
  });

  it("propaga erro de rede real", async () => {
    getDocMock.mockRejectedValueOnce({ code: "unavailable" });

    await expect(getPublicProduct("p1")).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("getFeaturedProducts (compat loja, T030)", () => {
  it("filtra destaque, deleted e status — exigência da rule de leitura anônima", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("f1", { name: "Destaque" })]));

    await getFeaturedProducts();

    expect(whereMock).toHaveBeenCalledWith("destaque", "==", true);
    expect(whereMock).toHaveBeenCalledWith("deleted", "==", false);
    expect(whereMock).toHaveBeenCalledWith("status", "==", "ativo");
  });
});

describe("checkSkuAvailable", () => {
  it("retorna true quando só o próprio produto usa o SKU", async () => {
    getDocsMock
      .mockResolvedValueOnce(snapshotWith([fakeDoc("meu-produto", {})]))
      .mockResolvedValueOnce(emptySnapshot());

    expect(await checkSkuAvailable("NIKE-001", { ignoreProductId: "meu-produto" })).toBe(true);
  });

  it("retorna false quando outro produto usa o SKU em variação", async () => {
    getDocsMock
      .mockResolvedValueOnce(emptySnapshot())
      .mockResolvedValueOnce(snapshotWith([fakeDoc("outro", {})]));

    expect(await checkSkuAvailable("NIKE-001")).toBe(false);
  });
});
