import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  updateDoc,
  where,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

import db from "../firebase/firestore";
import { ORDER_STATUS, ORDER_STATUS_LABELS, isValidTransition } from "../constants/orderStatus";
import { PRODUCT_STATUS } from "../constants/product";
import { normalizeForSearch } from "../utils/slugify";
import { normalizeCode, isCouponValid, computeCouponEffect } from "../utils/coupon";

const PAGE_SIZE = 20;

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Dia de referência dos agregados (dailyStats) no fuso do lojista (data-model.md).
// en-CA produz yyyy-mm-dd, o formato do ID do documento.
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatOrderNumber(orderNumber) {
  return `#${String(orderNumber).padStart(6, "0")}`;
}

// serverTimestamp() não é permitido dentro de arrays — entradas do histórico
// usam Timestamp.now() (limitação documentada no data-model.md).
function historyEntry(status, { byUid, byName, reason = null }) {
  return { status, at: Timestamp.now(), byUid, byName, reason };
}

function variationLabel(variation) {
  return Object.values(variation?.attributes || {})
    .filter(Boolean)
    .join(" / ");
}

function emptyStats() {
  return { revenue: 0, orderCount: 0, unitsSold: 0, unitsByProduct: {} };
}

// Feature 009: agregados (receita + totais do cliente) contam na transição
// `pago`, não na criação. Um pedido "aplicou" agregados quando `aggregatesApplied`
// é true; pedidos LEGADOS (criados antes do refactor, sem o campo) sempre
// aplicaram na criação → `?? true`.
function aggregatesApplied(order) {
  return order.aggregatesApplied ?? true;
}

// Aplica o delta do pedido nos agregados do dia (direction: +1 criação, -1
// cancelamento/devolução) — sempre dentro da mesma transação do pedido (R-2/R-3).
function applyStatsDelta(stats, order, direction) {
  const next = {
    revenue: Math.max(0, (stats.revenue || 0) + direction * order.total),
    orderCount: Math.max(0, (stats.orderCount || 0) + direction),
    unitsSold: 0,
    unitsByProduct: { ...(stats.unitsByProduct || {}) },
  };

  let unitsDelta = 0;

  for (const item of order.items) {
    unitsDelta += direction * item.quantity;

    const entry = next.unitsByProduct[item.productId] || { name: item.name, units: 0 };
    const units = Math.max(0, entry.units + direction * item.quantity);

    if (units === 0) {
      delete next.unitsByProduct[item.productId];
    } else {
      next.unitsByProduct[item.productId] = { name: item.name, units };
    }
  }

  next.unitsSold = Math.max(0, (stats.unitsSold || 0) + unitsDelta);

  return next;
}

// Devolve/retira estoque de um documento de produto para os itens do pedido.
function productWithStockDelta(product, items, direction) {
  const next = { ...product };

  for (const item of items) {
    if (item.variationId) {
      next.variations = (next.variations || []).map((variation) =>
        variation.id === item.variationId
          ? { ...variation, stock: variation.stock + direction * item.quantity }
          : variation
      );
    } else {
      next.stock = (next.stock || 0) + direction * item.quantity;
    }

    next.totalStock = (next.totalStock || 0) + direction * item.quantity;
  }

  return next;
}

// Criação de pedido — transação única (R-3): valida e baixa estoque, gera o
// número sequencial e grava o pedido com itens CONGELADOS (FR-053) no status
// `aguardando_pagamento`. Feature 009: NÃO conta receita/totais do cliente aqui
// — isso se move para a transição `pago` (createOrder ≠ venda confirmada).
// Estoque insuficiente aborta tudo.
export async function createOrder({
  customerId,
  items,
  shippingAddress,
  paymentMethod,
  cpf,
  shipping = null,
  shippingEtaDays = null,
  shippingMethod = "",
  shippingCep = "",
  couponCode = null,
  deliveryMethod = "entrega",
  pickupAddress = "",
}) {
  if (!items || items.length === 0) {
    throw serviceError("pedido-vazio", "O pedido precisa de ao menos um item.");
  }

  return runTransaction(db, async (tx) => {
    // ---- LEITURAS (todas antes de qualquer escrita — exigência do Firestore)
    const customerRef = doc(db, "users", customerId);
    const customerSnap = await tx.get(customerRef);

    if (!customerSnap.exists()) {
      throw serviceError("nao-encontrado", "Cliente não encontrado.");
    }

    const customer = customerSnap.data();

    // Cupom (feature 013): lê o doc do cupom (se houver) para revalidar e
    // recalcular o desconto pela AUTORIDADE — nunca confia num valor do client.
    const normalizedCoupon = couponCode ? normalizeCode(couponCode) : "";
    const couponSnap = normalizedCoupon
      ? await tx.get(doc(db, "coupons", normalizedCoupon))
      : null;

    const productIds = [...new Set(items.map((item) => item.productId))];
    const productData = {};

    for (const productId of productIds) {
      const snap = await tx.get(doc(db, "products", productId));

      if (!snap.exists() || snap.data().deleted || snap.data().status !== PRODUCT_STATUS.ATIVO) {
        throw serviceError("produto-indisponivel", "Um dos produtos não está disponível para venda.");
      }

      productData[productId] = snap.data();
    }

    const counterRef = doc(db, "counters", "orders");
    const counterSnap = await tx.get(counterRef);

    // ---- VALIDAÇÃO DE ESTOQUE + itens congelados
    const frozenItems = [];

    for (const item of items) {
      const product = productData[item.productId];
      let unitPrice = product.price;
      let label = null;

      if (item.variationId) {
        const variation = (product.variations || []).find((v) => v.id === item.variationId);

        if (!variation) {
          throw serviceError("nao-encontrado", "Variação do produto não encontrada.");
        }

        if (variation.stock < item.quantity) {
          throw serviceError("estoque-insuficiente", `Estoque insuficiente para "${product.name}".`);
        }

        unitPrice = variation.price ?? product.price;
        label = variationLabel(variation);
      } else if ((product.stock || 0) < item.quantity) {
        throw serviceError("estoque-insuficiente", `Estoque insuficiente para "${product.name}".`);
      }

      frozenItems.push({
        productId: item.productId,
        variationId: item.variationId || null,
        name: product.name,
        variationLabel: label,
        unitPrice,
        quantity: item.quantity,
        imageUrl: product.image || "",
      });
    }

    const subtotal = frozenItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // Cupom (feature 013): revalida contra o subtotal autoritativo e recalcula o
    // desconto. Cupom informado mas inválido (inexistente/expirado/esgotado/
    // abaixo do mínimo) aborta com aviso — o checkout refaz sem o cupom (FR-010).
    let discount = 0;
    let couponType = null;
    let appliedCouponCode = null;
    // Retirada na loja (feature 016): sem frete — o cliente busca o pedido.
    const isPickup = deliveryMethod === "retirada";
    let effectiveShipping = isPickup ? 0 : shipping;

    if (normalizedCoupon) {
      const coupon = couponSnap && couponSnap.exists() ? couponSnap.data() : null;
      const check = coupon
        ? isCouponValid(coupon, { subtotal, now: Date.now() })
        : { ok: false, error: "nao_encontrado" };

      if (!check.ok) {
        throw serviceError("cupom-invalido", "O cupom deixou de ser válido. Revise o pedido.");
      }

      const effect = computeCouponEffect(coupon, { subtotal, shipping: shipping || 0 });
      discount = effect.discount;
      couponType = coupon.type;
      appliedCouponCode = coupon.code;
      if (effect.freeShipping) {
        effectiveShipping = 0; // cupom de frete grátis zera o frete
      }
    }

    // Frete calculado pela M5a (tabela) e congelado no pedido; null = "a combinar"
    // (loja sem tabela configurada — fallback M4a). "retirada" = sem entrega.
    const total = subtotal - discount + (effectiveShipping || 0);
    const shippingStatus = isPickup
      ? "retirada"
      : effectiveShipping == null
        ? "a_calcular"
        : effectiveShipping === 0
          ? "gratis"
          : "calculado";
    const orderNumber = (counterSnap.exists() ? counterSnap.data().current : 0) + 1;

    const order = {
      orderNumber,
      customerId,
      customerName: customer.name || "",
      customerNameLower: normalizeForSearch(customer.name || ""),
      customerEmail: customer.email || "",
      customerEmailLower: normalizeForSearch(customer.email || ""),
      shippingAddress: isPickup ? null : shippingAddress || null,
      deliveryMethod,
      // Endereço da loja congelado no pedido (mudar a config não altera pedidos).
      pickupAddress: isPickup ? pickupAddress || "" : null,
      paymentMethod: paymentMethod || "",
      cpf: cpf || "",
      items: frozenItems,
      productIds,
      subtotal,
      shipping: effectiveShipping,
      shippingStatus,
      shippingEtaDays: isPickup ? null : shippingEtaDays,
      shippingMethod: isPickup ? "Retirada na loja" : shippingMethod || "",
      shippingCep: isPickup ? "" : shippingCep || "",
      couponCode: appliedCouponCode,
      couponType,
      discount,
      total,
      status: ORDER_STATUS.AGUARDANDO_PAGAMENTO,
      statusHistory: [
        historyEntry(ORDER_STATUS.AGUARDANDO_PAGAMENTO, {
          byUid: customerId,
          byName: customer.name || customer.email || "",
        }),
      ],
      trackingCode: null,
      internalNotes: null,
      // Agregados (receita/totais) contam só no `pago` (feature 009).
      aggregatesApplied: false,
      statsDay: null,
      createdAt: serverTimestamp(),
    };

    // ---- ESCRITAS: estoque (baixa) + número + pedido. SEM dailyStats nem
    // totais do cliente (movidos para a transição `pago`).
    for (const productId of productIds) {
      const itemsOfProduct = frozenItems.filter((item) => item.productId === productId);

      tx.update(
        doc(db, "products", productId),
        productWithStockDelta(productData[productId], itemsOfProduct, -1)
      );
    }

    tx.set(counterRef, { current: orderNumber });

    const orderRef = doc(collection(db, "orders"));
    tx.set(orderRef, order);

    return { id: orderRef.id, orderNumber };
  });
}

// Avanço de status sem efeito de estoque (pago, em separação, enviado,
// entregue). Cancelamento e devolução têm funções próprias porque devolvem
// estoque — bloqueados aqui para impedir mudança de status sem o efeito.
// Feature 009: ao marcar como PAGO pela 1ª vez, APLICA os agregados (receita do
// dia + totais do cliente) — a venda só conta quando paga.
export async function advanceStatus(id, nextStatus, { byUid, byName }) {
  await runTransaction(db, async (tx) => {
    // ---- LEITURAS
    const ref = doc(db, "orders", id);
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw serviceError("nao-encontrado", "Pedido não encontrado.");
    }

    const order = snap.data();

    if (nextStatus === ORDER_STATUS.CANCELADO || nextStatus === ORDER_STATUS.DEVOLVIDO) {
      throw serviceError(
        "transicao-invalida",
        "Use a ação de cancelamento/devolução — ela devolve o estoque junto."
      );
    }

    if (!isValidTransition(order.status, nextStatus)) {
      throw serviceError(
        "transicao-invalida",
        `Não é possível ir de "${ORDER_STATUS_LABELS[order.status]}" para "${ORDER_STATUS_LABELS[nextStatus]}".`
      );
    }

    const applyingPaid = nextStatus === ORDER_STATUS.PAGO && !aggregatesApplied(order);
    const payDay = dayKey();

    let statsRef;
    let statsSnap;
    let customerRef;
    let customerSnap;
    let couponRef;
    let couponSnap;

    if (applyingPaid) {
      statsRef = doc(db, "dailyStats", payDay);
      statsSnap = await tx.get(statsRef);
      customerRef = doc(db, "users", order.customerId);
      customerSnap = await tx.get(customerRef);

      // Cupom (feature 013): o uso conta quando a venda se confirma (pago), não
      // na criação — pedido não pago não consome o cupom.
      if (order.couponCode) {
        couponRef = doc(db, "coupons", order.couponCode);
        couponSnap = await tx.get(couponRef);
      }
    }

    // ---- ESCRITAS
    if (applyingPaid) {
      const stats = statsSnap.exists() ? statsSnap.data() : emptyStats();
      tx.set(statsRef, { ...applyStatsDelta(stats, order, +1), updatedAt: serverTimestamp() });

      if (customerSnap.exists()) {
        const customer = customerSnap.data();

        tx.update(customerRef, {
          orderCount: (customer.orderCount || 0) + 1,
          totalSpent: (customer.totalSpent || 0) + order.total,
        });
      }

      // Incremento de uso do cupom (guard aggregatesApplied garante 1x). Cupom
      // removido depois → snap inexistente → apenas não incrementa.
      if (couponSnap && couponSnap.exists()) {
        tx.update(couponRef, { usedCount: (couponSnap.data().usedCount || 0) + 1 });
      }
    }

    tx.update(ref, {
      status: nextStatus,
      statusHistory: [...(order.statusHistory || []), historyEntry(nextStatus, { byUid, byName })],
      ...(applyingPaid ? { aggregatesApplied: true, statsDay: payDay } : {}),
    });
  });
}

// Cancelamento/devolução — transação única (SC-009): mudança de status +
// devolução de estoque + ajuste de dailyStats (no dia ORIGINAL do pedido) +
// agregados do cliente. Tudo ou nada.
async function restockAndClose(id, targetStatus, { reason, byUid, byName }) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "orders", id);
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw serviceError("nao-encontrado", "Pedido não encontrado.");
    }

    const order = snap.data();

    if (!isValidTransition(order.status, targetStatus)) {
      throw serviceError(
        "transicao-invalida",
        `Não é possível ir de "${ORDER_STATUS_LABELS[order.status]}" para "${ORDER_STATUS_LABELS[targetStatus]}".`
      );
    }

    const productSnaps = {};

    for (const productId of order.productIds || []) {
      const productSnap = await tx.get(doc(db, "products", productId));

      if (productSnap.exists()) {
        productSnaps[productId] = productSnap.data();
      }
      // Produto excluído fisicamente não pode ter pedidos (R-7); soft delete
      // mantém o doc — estoque ainda é devolvido para auditoria correta.
    }

    // Feature 009: só reverte agregados se o pedido chegou a aplicá-los (foi
    // pago). Um pedido pendente cancelado devolve estoque sem mexer em receita/
    // totais (que nunca foram somados).
    const reverseAggregates = aggregatesApplied(order);

    let statsRef;
    let statsSnap;
    let customerRef;
    let customerSnap;

    if (reverseAggregates) {
      statsRef = doc(db, "dailyStats", order.statsDay || dayKey());
      statsSnap = await tx.get(statsRef);
      customerRef = doc(db, "users", order.customerId);
      customerSnap = await tx.get(customerRef);
    }

    // ---- ESCRITAS
    for (const [productId, product] of Object.entries(productSnaps)) {
      const itemsOfProduct = order.items.filter((item) => item.productId === productId);

      tx.update(
        doc(db, "products", productId),
        productWithStockDelta(product, itemsOfProduct, +1)
      );
    }

    if (reverseAggregates && statsSnap.exists()) {
      tx.set(statsRef, {
        ...applyStatsDelta(statsSnap.data(), order, -1),
        updatedAt: serverTimestamp(),
      });
    }

    if (reverseAggregates && customerSnap.exists()) {
      const customer = customerSnap.data();

      tx.update(customerRef, {
        orderCount: Math.max(0, (customer.orderCount || 0) - 1),
        totalSpent: Math.max(0, (customer.totalSpent || 0) - order.total),
      });
    }

    tx.update(ref, {
      status: targetStatus,
      statusHistory: [
        ...(order.statusHistory || []),
        historyEntry(targetStatus, { byUid, byName, reason }),
      ],
    });
  });
}

export async function cancelOrder(id, { reason, byUid, byName }) {
  if (!reason || !reason.trim()) {
    throw serviceError("motivo-obrigatorio", "Informe o motivo do cancelamento.");
  }

  await restockAndClose(id, ORDER_STATUS.CANCELADO, { reason: reason.trim(), byUid, byName });
}

export async function returnOrder(id, { reason = null, byUid, byName }) {
  await restockAndClose(id, ORDER_STATUS.DEVOLVIDO, { reason, byUid, byName });
}

export async function setTrackingCode(id, code) {
  await updateDoc(doc(db, "orders", id), { trackingCode: code || null });
}

export async function setInternalNotes(id, notes) {
  await updateDoc(doc(db, "orders", id), { internalNotes: notes || null });
}

export async function getOrder(id) {
  const snapshot = await getDoc(doc(db, "orders", id));

  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

// "Meus pedidos" do cliente logado (feature 007, US4). Reusa o índice
// `customerId + createdAt` já existente (nenhum índice novo).
export function listMyOrders(uid, { pageSize = PAGE_SIZE, cursor = null } = {}) {
  return listOrders({ customerId: uid, pageSize, cursor });
}

// Detalhe de um pedido do próprio cliente. Retorna `null` se o pedido não
// existir OU não pertencer ao usuário (SC-006) — nunca vaza pedido alheio,
// mesmo que o cliente adivinhe o id na URL. As rules barram no servidor; esta
// checagem evita exibir dado de outro caso a leitura passe.
export async function getMyOrder(id, uid) {
  const order = await getOrder(id);

  if (!order || order.customerId !== uid) {
    return null;
  }

  return order;
}

export async function listOrders({
  search = "",
  status = "",
  dateFrom = null,
  dateTo = null,
  customerId = "",
  pageSize = PAGE_SIZE,
  cursor = null,
} = {}) {
  const col = collection(db, "orders");

  if (search.trim()) {
    const term = search.trim();

    // Número do pedido: match exato (com ou sem "#").
    if (/^#?\d+$/.test(term)) {
      const snapshot = await getDocs(
        query(col, where("orderNumber", "==", Number(term.replace("#", ""))), limit(pageSize))
      );

      return {
        items: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
        nextCursor: null,
        hasMore: false,
      };
    }

    // Cliente: a busca cobre o que a coluna exibe — nome quando houver,
    // e-mail como alternativa (customerEmailLower). Duas queries de prefixo
    // mescladas por id (padrão R-5); sem paginação (range + merge).
    const nameTerm = normalizeForSearch(term);
    const prefixEnd = nameTerm + String.fromCharCode(0xf8ff);
    const [byName, byEmail] = await Promise.all([
      getDocs(query(
        col,
        where("customerNameLower", ">=", nameTerm),
        where("customerNameLower", "<=", prefixEnd),
        orderBy("customerNameLower", "asc"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      )),
      getDocs(query(
        col,
        where("customerEmailLower", ">=", nameTerm),
        where("customerEmailLower", "<=", prefixEnd),
        orderBy("customerEmailLower", "asc"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      )),
    ]);

    const merged = new Map();

    for (const docSnap of [...byName.docs, ...byEmail.docs]) {
      merged.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
    }

    const items = [...merged.values()]
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      .slice(0, pageSize);

    return { items, nextCursor: null, hasMore: false };
  }

  const constraints = [];

  if (status) {
    constraints.push(where("status", "==", status));
  }

  if (customerId) {
    constraints.push(where("customerId", "==", customerId));
  }

  if (dateFrom) {
    constraints.push(where("createdAt", ">=", Timestamp.fromDate(dateFrom)));
  }

  if (dateTo) {
    constraints.push(where("createdAt", "<=", Timestamp.fromDate(dateTo)));
  }

  constraints.push(orderBy("createdAt", "desc"));

  let cursorSnap = cursor;

  if (typeof cursor === "string") {
    cursorSnap = await getDoc(doc(db, "orders", cursor));

    if (!cursorSnap.exists()) {
      cursorSnap = null;
    }
  }

  if (cursorSnap) {
    constraints.push(startAfter(cursorSnap));
  }

  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(col, ...constraints));
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() })),
    nextCursor: docs.length ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
}
