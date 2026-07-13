import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import { effectivePrice } from "../utils/promo";
import { cloudinaryUrl, IMAGE_WIDTHS } from "../services/cloudinaryService";
import { getPublicProduct } from "../services/productService";
import { useAuth } from "./AuthContext";

// Carrinho da vitrine (feature 005/006, D4/FR-019). Interface DEFINITIVA. No M2
// o estado é persistido em localStorage e revalidado contra o Firestore ao
// abrir o carrinho (o item salvo ontem pode estar esgotado, com outro preço ou
// desativado hoje). Cada linha é identificada por productId + variationId.
//
// O `unitPrice` guardado é o preço EFETIVO de exibição (promoção vigente). A
// autoridade do valor cobrado é o preço congelado na transação do pedido (M4);
// a revalidação apenas evita levar dados velhos ao checkout.

const CartContext = createContext(null);

// Carrinho isolado por IDENTIDADE (feature 007): cada usuário tem sua própria
// chave; o visitante anônimo usa `:guest`. Sem isso, trocar de conta na mesma
// aba vazava o carrinho de um cliente para o próximo (regressão do M2) — e no
// M4 isso viraria pedido com item de outra pessoa.
const STORAGE_PREFIX = "versastore:cart";

function cartKey(uid) {
  return uid ? `${STORAGE_PREFIX}:${uid}` : `${STORAGE_PREFIX}:guest`;
}

function lineIdOf(productId, variationId) {
  return variationId ? `${productId}::${variationId}` : productId;
}

// Mescla dois carrinhos por lineId, somando quantidades e travando no estoque.
// Usado no login para juntar o que o visitante montou ao carrinho salvo dele.
function mergeCarts(base, extra) {
  const byId = new Map(base.map((line) => [line.lineId, { ...line }]));

  for (const line of extra) {
    const existing = byId.get(line.lineId);

    if (existing) {
      const cap = existing.maxStock ?? line.maxStock ?? Infinity;
      existing.quantity = Math.min(existing.quantity + line.quantity, cap);
    } else {
      byId.set(line.lineId, { ...line });
    }
  }

  return [...byId.values()];
}

function variationLabelOf(variation) {
  if (!variation) {
    return null;
  }

  return Object.values(variation.attributes || {}).filter(Boolean).join(" / ") || null;
}

// Carga inicial do localStorage, tolerante a dado corrompido/ausente.
function loadStored(key) {
  try {
    const raw = localStorage.getItem(key);
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
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Carga inicial já na chave da identidade atual. O CartProvider só monta
  // depois que o AuthContext resolve o loading, então `uid` já está correto
  // aqui — refresh logado NÃO dispara a mesclagem de login abaixo.
  const [items, dispatch] = useReducer(reducer, uid, (u) => loadStored(cartKey(u)));

  const uidRef = useRef(uid);
  const persistedUidRef = useRef(uid);

  // Reage à troca de identidade na mesma aba (login / logout / troca de conta).
  useEffect(() => {
    const prevUid = uidRef.current;

    if (prevUid === uid) {
      return;
    }

    uidRef.current = uid;

    if (prevUid === null && uid) {
      // Login: mescla o carrinho do visitante no carrinho salvo do usuário e
      // limpa a chave do visitante para não vazar para outra conta.
      const merged = mergeCarts(loadStored(cartKey(uid)), loadStored(cartKey(null)));

      try {
        localStorage.removeItem(cartKey(null));
      } catch {
        // ignora
      }

      dispatch({ type: "replace", items: merged });
    } else {
      // Logout ou troca de usuário: carrega o carrinho da nova identidade
      // (visitante começa limpo; usuário recupera o carrinho salvo dele).
      dispatch({ type: "replace", items: loadStored(cartKey(uid)) });
    }
  }, [uid]);

  // Persiste a cada mudança, sempre na chave da identidade atual. No render em
  // que a identidade muda, pula a escrita: o efeito de troca acima vai
  // recarregar o estado e a persistência ocorre no render seguinte — evita
  // gravar o carrinho antigo na chave nova.
  useEffect(() => {
    if (persistedUidRef.current !== uid) {
      persistedUidRef.current = uid;
      return;
    }

    try {
      localStorage.setItem(cartKey(uid), JSON.stringify(items));
    } catch {
      // Cota cheia / modo privado: ignora — o carrinho segue em memória.
    }
  }, [items, uid]);

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
    const current = loadStored(cartKey(uidRef.current));
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
