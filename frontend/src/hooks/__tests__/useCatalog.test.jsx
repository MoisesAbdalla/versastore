import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const listPublicProductsMock = vi.fn();

vi.mock("../../services/productService", () => ({
  listPublicProducts: (...args) => listPublicProductsMock(...args),
}));

vi.mock("../../services/categoryService", () => ({
  listCategories: vi.fn(async () => [
    { id: "cat-1", name: "Camisetas", slug: "camisetas", children: [] },
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

describe("useCatalog", () => {
  it("carrega a primeira página com os filtros da URL (categoria resolvida por slug)", async () => {
    listPublicProductsMock.mockResolvedValueOnce(page([{ id: "p1" }]));

    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperFor("/products?categoria=camisetas&ordenar=preco-asc"),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listPublicProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "cat-1", sort: "preco-asc", search: "" })
    );
    expect(result.current.items).toEqual([{ id: "p1" }]);
    expect(result.current.filters.categoria).toBe("camisetas");
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

  it("slug de categoria desconhecido → sem resultados, sem consultar", async () => {
    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperFor("/products?categoria=inexistente"),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(listPublicProductsMock).not.toHaveBeenCalled();
  });

  it("setFilters escreve na URL e omite a ordenação padrão", async () => {
    listPublicProductsMock.mockResolvedValue(page([]));

    const { result } = renderHook(() => useCatalog(), {
      wrapper: wrapperFor("/products"),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilters({ ordenar: "recentes", categoria: "camisetas" }));

    await waitFor(() => expect(result.current.filters.categoria).toBe("camisetas"));
    expect(result.current.filters.ordenar).toBe("recentes");
  });
});
