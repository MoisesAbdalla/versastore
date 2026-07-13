import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { CartProvider, useCart } from "../CartContext";

function wrapper({ children }) {
  return <CartProvider>{children}</CartProvider>;
}

const simpleProduct = { id: "p1", name: "Boné", price: 5000, stock: 3, variations: [] };
const varProduct = {
  id: "p2",
  name: "Camiseta",
  price: 8000,
  variations: [
    { id: "v1", attributes: { tamanho: "M" }, sku: "CAM-M", price: null, stock: 2 },
    { id: "v2", attributes: { tamanho: "G" }, sku: "CAM-G", price: 9000, stock: 0 },
  ],
};

describe("CartContext", () => {
  it("adiciona item simples e calcula count/subtotal", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      const r = result.current.addItem(simpleProduct, null, 2);
      expect(r.ok).toBe(true);
    });

    expect(result.current.count).toBe(2);
    expect(result.current.subtotal).toBe(10000);
  });

  it("soma quantidade na mesma linha (mesma variação)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const variation = varProduct.variations[0];

    act(() => result.current.addItem(varProduct, variation, 1));
    act(() => result.current.addItem(varProduct, variation, 1));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.count).toBe(2);
  });

  it("bloqueia adicionar produto com variações sem escolher variação", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    let r;
    act(() => {
      r = result.current.addItem(varProduct, null, 1);
    });

    expect(r).toEqual({ ok: false, reason: "variacao-obrigatoria" });
    expect(result.current.count).toBe(0);
  });

  it("bloqueia variação esgotada (SC-004)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    let r;
    act(() => {
      r = result.current.addItem(varProduct, varProduct.variations[1], 1); // stock 0
    });

    expect(r).toEqual({ ok: false, reason: "sem-estoque" });
  });

  it("bloqueia quantidade acima do estoque", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    let r;
    act(() => {
      r = result.current.addItem(simpleProduct, null, 5); // stock 3
    });

    expect(r).toEqual({ ok: false, reason: "estoque-insuficiente" });
  });

  it("usa o preço da variação quando definido, senão o efetivo do produto", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(varProduct, varProduct.variations[0], 1)); // price null → 8000

    expect(result.current.items[0].unitPrice).toBe(8000);
    expect(result.current.items[0].variationLabel).toBe("M");
  });

  it("aplica o preço promocional vigente no unitPrice", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem({ ...simpleProduct, promoPrice: 4000 }, null, 1));

    expect(result.current.items[0].unitPrice).toBe(4000);
  });

  it("updateQty trava no estoque e remove ao chegar a zero", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(simpleProduct, null, 1));
    const { lineId } = result.current.items[0];

    act(() => result.current.updateQty(lineId, 99));
    expect(result.current.items[0].quantity).toBe(3); // maxStock

    act(() => result.current.updateQty(lineId, 0));
    expect(result.current.items).toHaveLength(0);
  });

  it("removeItem e clear esvaziam o carrinho", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(simpleProduct, null, 1));
    act(() => result.current.clear());

    expect(result.current.count).toBe(0);
  });
});
