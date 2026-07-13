import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const getPublicProductMock = vi.fn();

vi.mock("../../services/productService", () => ({
  getPublicProduct: (...args) => getPublicProductMock(...args),
}));

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

beforeEach(() => {
  localStorage.clear();
  getPublicProductMock.mockReset();
});

describe("CartContext — operações", () => {
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
      r = result.current.addItem(varProduct, varProduct.variations[1], 1);
    });

    expect(r).toEqual({ ok: false, reason: "sem-estoque" });
  });

  it("bloqueia quantidade acima do estoque", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    let r;
    act(() => {
      r = result.current.addItem(simpleProduct, null, 5);
    });

    expect(r).toEqual({ ok: false, reason: "estoque-insuficiente" });
  });

  it("usa o preço da variação quando definido, senão o efetivo do produto", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem(varProduct, varProduct.variations[0], 1));

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
    expect(result.current.items[0].quantity).toBe(3);

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

describe("CartContext — persistência em localStorage (M2)", () => {
  it("persiste no localStorage e recarrega o carrinho na montagem", () => {
    const first = renderHook(() => useCart(), { wrapper });

    act(() => first.result.current.addItem(simpleProduct, null, 2));

    expect(JSON.parse(localStorage.getItem("versastore:cart"))).toHaveLength(1);

    // Nova montagem lê o localStorage (lazy init).
    const second = renderHook(() => useCart(), { wrapper });

    expect(second.result.current.count).toBe(2);
  });

  it("carga inicial tolera localStorage corrompido (cai para vazio)", () => {
    localStorage.setItem("versastore:cart", "{ nao é json");

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.items).toEqual([]);
  });
});

describe("CartContext — revalidação contra o Firestore (M2)", () => {
  function seedCart(lines) {
    localStorage.setItem("versastore:cart", JSON.stringify(lines));
  }

  const line = {
    lineId: "p1",
    productId: "p1",
    variationId: null,
    name: "Boné",
    unitPrice: 5000,
    quantity: 2,
    maxStock: 3,
  };

  it("atualiza preço e estoque e não sinaliza quando nada mudou de forma relevante", async () => {
    seedCart([line]);
    getPublicProductMock.mockResolvedValueOnce({ id: "p1", price: 5000, stock: 3, variations: [] });

    const { result } = renderHook(() => useCart(), { wrapper });

    let changes;
    await act(async () => {
      changes = await result.current.revalidate();
    });

    expect(changes).toEqual([]);
    expect(result.current.items[0].maxStock).toBe(3);
  });

  it("remove item de produto que sumiu/foi desativado (getPublicProduct → null)", async () => {
    seedCart([line]);
    getPublicProductMock.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useCart(), { wrapper });

    let changes;
    await act(async () => {
      changes = await result.current.revalidate();
    });

    expect(changes).toEqual([{ name: "Boné", type: "indisponivel" }]);
    expect(result.current.items).toHaveLength(0);
  });

  it("remove item que esgotou (estoque 0)", async () => {
    seedCart([line]);
    getPublicProductMock.mockResolvedValueOnce({ id: "p1", price: 5000, stock: 0, variations: [] });

    const { result } = renderHook(() => useCart(), { wrapper });

    let changes;
    await act(async () => {
      changes = await result.current.revalidate();
    });

    expect(changes).toEqual([{ name: "Boné", type: "esgotado" }]);
    expect(result.current.items).toHaveLength(0);
  });

  it("reduz a quantidade quando o estoque caiu abaixo dela", async () => {
    seedCart([line]); // quantity 2
    getPublicProductMock.mockResolvedValueOnce({ id: "p1", price: 5000, stock: 1, variations: [] });

    const { result } = renderHook(() => useCart(), { wrapper });

    let changes;
    await act(async () => {
      changes = await result.current.revalidate();
    });

    expect(changes).toContainEqual({ name: "Boné", type: "quantidade", to: 1 });
    expect(result.current.items[0].quantity).toBe(1);
  });

  it("atualiza o preço e sinaliza quando mudou", async () => {
    seedCart([line]); // unitPrice 5000
    getPublicProductMock.mockResolvedValueOnce({ id: "p1", price: 4500, stock: 3, variations: [] });

    const { result } = renderHook(() => useCart(), { wrapper });

    let changes;
    await act(async () => {
      changes = await result.current.revalidate();
    });

    expect(changes).toContainEqual({ name: "Boné", type: "preco" });
    expect(result.current.items[0].unitPrice).toBe(4500);
  });

  it("remove item cuja variação não existe mais", async () => {
    seedCart([{ ...line, lineId: "p2::vx", productId: "p2", variationId: "vx", name: "Camiseta" }]);
    getPublicProductMock.mockResolvedValueOnce({
      id: "p2",
      price: 8000,
      variations: [{ id: "v1", stock: 5 }],
    });

    const { result } = renderHook(() => useCart(), { wrapper });

    let changes;
    await act(async () => {
      changes = await result.current.revalidate();
    });

    expect(changes).toEqual([{ name: "Camiseta", type: "indisponivel" }]);
    expect(result.current.items).toHaveLength(0);
  });
});
