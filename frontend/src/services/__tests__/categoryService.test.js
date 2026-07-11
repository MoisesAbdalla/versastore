import { describe, it, expect, vi, beforeEach } from "vitest";

const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const deleteDocMock = vi.fn();
const getDocMock = vi.fn();
const getDocsMock = vi.fn();
const batchUpdateMock = vi.fn();
const batchCommitMock = vi.fn();
const whereMock = vi.fn((field, op, value) => ({ field, op, value }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args) => addDocMock(...args),
  collection: vi.fn((db, name) => ({ collectionName: name })),
  deleteDoc: (...args) => deleteDocMock(...args),
  doc: vi.fn((db, collectionName, id) => ({ collectionName, id })),
  getDoc: (...args) => getDocMock(...args),
  getDocs: (...args) => getDocsMock(...args),
  limit: vi.fn(),
  query: vi.fn((col, ...constraints) => ({ col, constraints })),
  updateDoc: (...args) => updateDocMock(...args),
  where: (...args) => whereMock(...args),
  writeBatch: vi.fn(() => ({ update: batchUpdateMock, commit: batchCommitMock })),
  serverTimestamp: () => "server-timestamp",
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  moveProducts,
} from "../categoryService";

function fakeDoc(id, data) {
  return { id, data: () => data, exists: () => true };
}

function snapshotWith(docs) {
  return { empty: docs.length === 0, docs };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Filas de mockResolvedValueOnce não são limpas por clearAllMocks — reset
  // explícito evita vazamento de valores entre testes.
  getDocMock.mockReset();
  getDocsMock.mockReset();
});

describe("listCategories", () => {
  it("monta a árvore de 2 níveis ordenada por nome", async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshotWith([
        fakeDoc("c2", { name: "Masculino", parentId: null }),
        fakeDoc("c1", { name: "Feminino", parentId: null }),
        fakeDoc("c3", { name: "Vestidos", parentId: "c1" }),
      ])
    );

    const tree = await listCategories();

    expect(tree.map((c) => c.name)).toEqual(["Feminino", "Masculino"]);
    expect(tree[0].children.map((c) => c.name)).toEqual(["Vestidos"]);
    expect(tree[1].children).toEqual([]);
  });
});

describe("createCategory", () => {
  it("cria categoria raiz com slug derivado do nome", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([]));
    addDocMock.mockResolvedValueOnce({ id: "nova" });

    await createCategory({ name: "Calçados Femininos" });

    const [, data] = addDocMock.mock.calls[0];

    expect(data.slug).toBe("calcados-femininos");
    expect(data.nameLower).toBe("calcados femininos");
    expect(data.parentId).toBe(null);
  });

  it("bloqueia slug duplicado", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("existente", {})]));

    await expect(createCategory({ name: "Calçados" })).rejects.toMatchObject({
      code: "slug-duplicado",
    });
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it("bloqueia 3º nível de hierarquia (pai que já é subcategoria)", async () => {
    getDocMock.mockResolvedValueOnce(fakeDoc("sub", { parentId: "raiz" }));

    await expect(
      createCategory({ name: "Neta", parentId: "sub" })
    ).rejects.toMatchObject({ code: "hierarquia-invalida" });
  });
});

describe("updateCategory", () => {
  it("propaga rename para categoryName dos produtos", async () => {
    getDocMock.mockResolvedValueOnce(fakeDoc("c1", { name: "Antigo", slug: "antigo", parentId: null }));
    // Slug não muda no rename → único getDocs é a busca de produtos da categoria.
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("p1", {}), fakeDoc("p2", {})]));
    updateDocMock.mockResolvedValueOnce(undefined);

    await updateCategory("c1", { name: "Novo Nome" });

    expect(batchUpdateMock).toHaveBeenCalledTimes(2);

    const [, productChanges] = batchUpdateMock.mock.calls[0];

    expect(productChanges.categoryName).toBe("Novo Nome");
    expect(batchCommitMock).toHaveBeenCalled();
  });

  it("bloqueia categoria com filhos de virar subcategoria", async () => {
    getDocMock.mockResolvedValueOnce(fakeDoc("c1", { name: "Pai", slug: "pai", parentId: null }));
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("filho", {})]));

    await expect(updateCategory("c1", { parentId: "outra" })).rejects.toMatchObject({
      code: "hierarquia-invalida",
    });
  });
});

describe("deleteCategory", () => {
  it("bloqueia exclusão de categoria com subcategorias", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("filho", {})]));

    await expect(deleteCategory("c1")).rejects.toMatchObject({
      code: "categoria-com-subcategorias",
    });
    expect(deleteDocMock).not.toHaveBeenCalled();
  });

  it("bloqueia exclusão de categoria com produtos ativos", async () => {
    getDocsMock
      .mockResolvedValueOnce(snapshotWith([])) // sem subcategorias
      .mockResolvedValueOnce(snapshotWith([fakeDoc("p1", {})])); // com produtos

    await expect(deleteCategory("c1")).rejects.toMatchObject({
      code: "categoria-com-produtos",
    });
    expect(deleteDocMock).not.toHaveBeenCalled();
  });

  it("exclui categoria vazia", async () => {
    getDocsMock
      .mockResolvedValueOnce(snapshotWith([]))
      .mockResolvedValueOnce(snapshotWith([]));
    deleteDocMock.mockResolvedValueOnce(undefined);

    await deleteCategory("c1");

    expect(deleteDocMock).toHaveBeenCalledWith({ collectionName: "categories", id: "c1" });
  });
});

describe("moveProducts", () => {
  it("move todos os produtos atualizando categoryId e nome desnormalizado", async () => {
    getDocMock.mockResolvedValueOnce(fakeDoc("destino", { name: "Destino" }));
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("p1", {}), fakeDoc("p2", {})]));

    const moved = await moveProducts("origem", "destino");

    expect(moved).toBe(2);

    const [, changes] = batchUpdateMock.mock.calls[0];

    expect(changes).toEqual({ categoryId: "destino", categoryName: "Destino", category: "Destino" });
    expect(batchCommitMock).toHaveBeenCalled();
  });

  it("retorna 0 sem commitar quando a origem não tem produtos", async () => {
    getDocMock.mockResolvedValueOnce(fakeDoc("destino", { name: "Destino" }));
    getDocsMock.mockResolvedValueOnce(snapshotWith([]));

    expect(await moveProducts("origem", "destino")).toBe(0);
    expect(batchCommitMock).not.toHaveBeenCalled();
  });
});
