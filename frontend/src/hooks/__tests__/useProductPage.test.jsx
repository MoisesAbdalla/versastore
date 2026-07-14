import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const getPublicProductMock = vi.fn();

vi.mock("../../services/productService", () => ({
  getPublicProduct: (...args) => getPublicProductMock(...args),
}));

import { useProductPage } from "../useProductPage";

beforeEach(() => {
  getPublicProductMock.mockReset();
});

describe("useProductPage (carga)", () => {
  it("notFound quando o produto público retorna null (inativo/inexistente/negado)", async () => {
    getPublicProductMock.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useProductPage("x"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.product).toBe(null);
  });

  it("carrega o produto e expõe refresh", async () => {
    getPublicProductMock.mockResolvedValue({ id: "p1", name: "Boné", price: 5000, stock: 3 });

    const { result } = renderHook(() => useProductPage("p1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.product?.name).toBe("Boné");

    await result.current.refresh();
    expect(getPublicProductMock).toHaveBeenCalledTimes(2);
  });

  it("erro de rede propaga para a UI tratar", async () => {
    getPublicProductMock.mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useProductPage("p1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
