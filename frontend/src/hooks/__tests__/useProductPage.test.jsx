import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const getPublicProductMock = vi.fn();

vi.mock("../../services/productService", () => ({
  getPublicProduct: (...args) => getPublicProductMock(...args),
}));

import { useProductPage } from "../useProductPage";

beforeEach(() => {
  getPublicProductMock.mockReset();
});

describe("useProductPage", () => {
  it("notFound quando o produto público retorna null (inativo/inexistente/negado)", async () => {
    getPublicProductMock.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useProductPage("x"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.product).toBe(null);
  });

  it("produto simples com estoque permite comprar", async () => {
    getPublicProductMock.mockResolvedValueOnce({
      id: "p1",
      name: "Boné",
      price: 5000,
      stock: 3,
      variations: [],
    });

    const { result } = renderHook(() => useProductPage("p1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentStock).toBe(3);
    expect(result.current.canBuy).toBe(true);
  });

  it("produto com variações: canBuy só após selecionar variação com estoque (SC-004)", async () => {
    getPublicProductMock.mockResolvedValueOnce({
      id: "p2",
      name: "Camiseta",
      price: 8000,
      variations: [
        { id: "v1", attributes: { tamanho: "M" }, stock: 2 },
        { id: "v2", attributes: { tamanho: "G" }, stock: 0 },
      ],
    });

    const { result } = renderHook(() => useProductPage("p2"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canBuy).toBe(false); // nada selecionado

    act(() => result.current.selectVariation({ id: "v2", stock: 0 }));
    expect(result.current.canBuy).toBe(false); // esgotada

    act(() => result.current.selectVariation({ id: "v1", stock: 2 }));
    expect(result.current.canBuy).toBe(true);
    expect(result.current.currentStock).toBe(2);
  });
});
