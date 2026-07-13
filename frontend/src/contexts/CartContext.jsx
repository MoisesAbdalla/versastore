import { createContext, useCallback, useContext, useMemo, useReducer } from "react";

import { effectivePrice } from "../utils/promo";
import { cloudinaryUrl, IMAGE_WIDTHS } from "../services/cloudinaryService";

// Carrinho da vitrine (feature 005, D4/FR-019). Interface DEFINITIVA — o M2
// troca só a persistência (localStorage) sem alterar consumidores. No M1 o
// estado vive em memória (some ao recarregar). Cada linha é identificada por
// productId + variationId: a mesma variação soma quantidade; variações
// diferentes são linhas distintas.
//
// O `unitPrice` guardado é o preço EFETIVO de exibição (promoção vigente). A
// fonte de verdade do valor cobrado continua sendo o preço congelado na
// transação do pedido (M4) — o carrinho é conveniência de UI, não autoridade.

const CartContext = createContext(null);

function lineIdOf(productId, variationId) {
  return variationId ? `${productId}::${variationId}` : productId;
}

function variationLabelOf(variation) {
  if (!variation) {
    return null;
  }

  return Object.values(variation.attributes || {}).filter(Boolean).join(" / ") || null;
}

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { line } = action;
      const existing = state.find((item) => item.lineId === line.lineId);

      if (existing) {
        return state.map((item) =>
          item.lineId === line.lineId
            ? { ...item, quantity: Math.min(item.quantity + line.quantity, item.maxStock) }
            : item
        );
      }

      return [...state, line];
    }

    case "updateQty": {
      return state
        .map((item) =>
          item.lineId === action.lineId
            ? { ...item, quantity: Math.max(0, Math.min(action.qty, item.maxStock)) }
            : item
        )
        .filter((item) => item.quantity > 0);
    }

    case "remove":
      return state.filter((item) => item.lineId !== action.lineId);

    case "clear":
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, []);

  // addItem(product, variation, qty): valida seleção e estoque; soma à linha.
  const addItem = useCallback((product, variation = null, qty = 1) => {
    const hasVariations = (product.variations || []).length > 0;

    if (hasVariations && !variation) {
      return { ok: false, reason: "variacao-obrigatoria" };
    }

    const stock = variation ? variation.stock : product.stock ?? product.totalStock ?? 0;

    if (stock <= 0) {
      return { ok: false, reason: "sem-estoque" };
    }

    if (qty > stock) {
      return { ok: false, reason: "estoque-insuficiente" };
    }

    const unitPrice = variation?.price ?? effectivePrice(product).price;

    dispatch({
      type: "add",
      line: {
        lineId: lineIdOf(product.id, variation?.id),
        productId: product.id,
        variationId: variation?.id ?? null,
        name: product.name,
        variationLabel: variationLabelOf(variation),
        unitPrice,
        imageUrl: cloudinaryUrl(product.image, { w: IMAGE_WIDTHS.thumb }),
        quantity: qty,
        maxStock: stock,
      },
    });

    return { ok: true };
  }, []);

  const updateQty = useCallback((lineId, qty) => dispatch({ type: "updateQty", lineId, qty }), []);
  const removeItem = useCallback((lineId) => dispatch({ type: "remove", lineId }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return { items, count, subtotal, addItem, updateQty, removeItem, clear };
  }, [items, addItem, updateQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
