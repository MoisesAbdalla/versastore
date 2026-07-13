import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

import { effectivePrice } from "../utils/promo";
import { cloudinaryUrl, IMAGE_WIDTHS } from "../services/cloudinaryService";
import { getPublicProduct } from "../services/productService";

// Carrinho da vitrine (feature 005/006, D4/FR-019). Interface DEFINITIVA. No M2
// o estado é persistido em localStorage e revalidado contra o Firestore ao
// abrir o carrinho (o item salvo ontem pode estar esgotado, com outro preço ou
// desativado hoje). Cada linha é identificada por productId + variationId.
//
// O `unitPrice` guardado é o preço EFETIVO de exibição (promoção vigente). A
// autoridade do valor cobrado é o preço congelado na transação do pedido (M4);
// a revalidação apenas evita levar dados velhos ao checkout.

const CartContext = createContext(null);

const STORAGE_KEY = "versastore:cart";

function lineIdOf(productId, variationId) {
  return variationId ? `${productId}::${variationId}` : productId;
}

function variationLabelOf(variation) {
  if (!variation) {
    return null;
  }

  return Object.values(variation.attributes || {}).filter(Boolean).join(" / ") || null;
}

// Carga inicial do localStorage, tolerante a dado corrompido/ausente.
function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

    case "replace":
      return action.items;

    case "clear":
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, loadStored);

  // Persiste a cada mudança (M2).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Cota cheia / modo privado: ignora — o carrinho segue em memória.
    }
  }, [items]);

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

  // Revalida o carrinho salvo contra o Firestore (M2). Para cada linha, ajusta
  // preço/estoque, remove o indisponível e devolve a lista do que mudou para a
  // UI sinalizar ao cliente. Reaproveitável pelo checkout (M4).
  const revalidate = useCallback(async () => {
    const current = loadStored();
    const productIds = [...new Set(current.map((item) => item.productId))];

    const products = await Promise.all(productIds.map((id) => getPublicProduct(id)));
    const byId = Object.fromEntries(productIds.map((id, i) => [id, products[i]]));

    const changes = [];
    const nextItems = [];

    for (const line of current) {
      const product = byId[line.productId];

      if (!product) {
        changes.push({ name: line.name, type: "indisponivel" });
        continue;
      }

      let stock;
      let unitPrice;

      if (line.variationId) {
        const variation = (product.variations || []).find((v) => v.id === line.variationId);

        if (!variation) {
          changes.push({ name: line.name, type: "indisponivel" });
          continue;
        }

        stock = variation.stock ?? 0;
        unitPrice = variation.price ?? effectivePrice(product).price;
      } else {
        stock = product.stock ?? product.totalStock ?? 0;
        unitPrice = effectivePrice(product).price;
      }

      if (stock <= 0) {
        changes.push({ name: line.name, type: "esgotado" });
        continue;
      }

      const nextLine = { ...line, unitPrice, maxStock: stock };

      if (line.quantity > stock) {
        nextLine.quantity = stock;
        changes.push({ name: line.name, type: "quantidade", to: stock });
      }

      if (unitPrice !== line.unitPrice) {
        changes.push({ name: line.name, type: "preco" });
      }

      nextItems.push(nextLine);
    }

    dispatch({ type: "replace", items: nextItems });

    return changes;
  }, []);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return { items, count, subtotal, addItem, updateQty, removeItem, clear, revalidate };
  }, [items, addItem, updateQty, removeItem, clear, revalidate]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
