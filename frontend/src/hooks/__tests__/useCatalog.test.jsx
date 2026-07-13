import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const listPublicProductsMock = vi.fn();

vi.mock("../../services/productService", () => ({
  listPublicProducts: (...args) => listPublicProductsMock(...args),
}));

// Árvore: raiz "feminino" com filha "acessorios-femininos".
vi.mock("../../services/categoryService", () => ({
  listCategories: vi.fn(async () => [
    {
      id: "fem",
      name: "Feminino",
      slug: "feminino",
      children: [{ id: "fem-aces", name: "Acessórios", slug: "acessorios-femininos" }],
    },
  ]),
}));

import { useCatalog } from "../useCatalog";

function wrapperFor(url) {
  return function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
  };
}

function page(items, hasMore = false, nextCursor = null) {
  return { items, hasMore, nextCursor };
}

beforeEach(() => {
  listPublicProductsMock.mockReset();
});

describe("useCatalog — hierarquia de categorias", () => {
  it("filtrar pela RAIZ agrega a raiz + todas as filhas (FR-003)", async () => {
    listPublicProductsMock.mockResolvedValueOnce(page([{ id: "p1" }]));

    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperFor("/products?categoria=feminino"),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listPublicProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryIds: ["fem", "fem-aces"] })
    );
  });

  it("filtrar por uma FILHA (sub) traz só a filha", async () => {
    listPublicProductsMock.mockResolvedValueOnce(page([{ id: "p1" }]));

    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperFor("/products?categoria=feminino&sub=acessorios-femininos"),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listPublicProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryIds: ["fem-aces"] })
    );
  });

  it("sem categoria não filtra (categoryIds vazio)", async () => {
    listPublicProductsMock.mockResolvedValueOnce(page([{ id: "p1" }]));

    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperFor("/products"),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listPublicProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryIds: [] })
    );
  });

  it("categoria inexistente → sem resultados, sem consultar", async () => {
    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperFor("/products?categoria=inexistente"),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(listPublicProductsMock).not.toHaveBeenCalled();
  });

  it("loadMore ANEXA a próxima página (R-8)", async () => {
    listPublicProductsMock
      .mockResolvedValueOnce(page([{ id: "p1" }], true, "cursor1"))
      .mockResolvedValueOnce(page([{ id: "p2" }], false, null));

    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperFor("/products"),
    });

    await waitFor(() => expect(result.current.hasMore).toBe(true));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toEqual([{ id: "p1" }, { id: "p2" }]);
    expect(result.current.hasMore).toBe(false);
  });
});
