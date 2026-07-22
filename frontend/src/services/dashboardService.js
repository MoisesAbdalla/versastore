import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import db from "../firebase/firestore";
import { dayKey } from "./orderService";
import { ORDER_STATUS } from "../constants/orderStatus";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../constants/product";
import { sumPeriod, periodKpis, mixDistribution } from "../utils/report";

// Visão geral lê SOMENTE agregados (dailyStats) e consultas com limit —
// nunca varre a coleção orders (research R-2, SC-003, constituição IV).

// Teto de estoque buscado para alertas: produtos com limite individual acima
// disso não disparam alerta de "baixo" (limitação documentada; o limite por
// produto é aplicado no cliente sobre esse conjunto).
const LOW_STOCK_FETCH_CAP = 20;

function keyToDate(key) {
  // Meio-dia com offset explícito de Brasília (UTC-3 fixo desde 2019):
  // a aritmética de dias fica independente do fuso da máquina.
  return new Date(`${key}T12:00:00-03:00`);
}

function addDays(key, days) {
  const date = keyToDate(key);

  date.setDate(date.getDate() + days);

  return dayKey(date);
}

function emptyTotals() {
  return { revenue: 0, orderCount: 0, unitsSold: 0 };
}

// Janela de N dias terminando hoje ({from, to} em chaves yyyy-mm-dd) — usada
// pelo seletor de período da visão geral.
export function periodRange(days, referenceKey = dayKey()) {
  return { from: addDays(referenceKey, -(days - 1)), to: referenceKey };
}

// Uma única range query por ID de documento cobre qualquer janela de dias.
async function getStatsRange(fromKey, toKey) {
  const snapshot = await getDocs(
    query(
      collection(db, "dailyStats"),
      where(documentId(), ">=", fromKey),
      where(documentId(), "<=", toKey)
    )
  );

  const byDay = new Map();

  for (const docSnap of snapshot.docs) {
    byDay.set(docSnap.id, docSnap.data());
  }

  return byDay;
}

function sumRange(byDay, fromKey, toKey) {
  const totals = emptyTotals();

  for (let key = fromKey; key <= toKey; key = addDays(key, 1)) {
    const stats = byDay.get(key);

    if (stats) {
      totals.revenue += stats.revenue || 0;
      totals.orderCount += stats.orderCount || 0;
      totals.unitsSold += stats.unitsSold || 0;
    }
  }

  return totals;
}

function withDerived(totals, previous) {
  const avgTicket = totals.orderCount > 0 ? Math.round(totals.revenue / totals.orderCount) : 0;
  const prevAvgTicket =
    previous.orderCount > 0 ? Math.round(previous.revenue / previous.orderCount) : 0;

  function delta(current, prev) {
    if (!prev) {
      return null; // sem base de comparação — a UI mostra "—"
    }

    return ((current - prev) / prev) * 100;
  }

  return {
    ...totals,
    avgTicket,
    deltas: {
      revenue: delta(totals.revenue, previous.revenue),
      orderCount: delta(totals.orderCount, previous.orderCount),
      unitsSold: delta(totals.unitsSold, previous.unitsSold),
      avgTicket: delta(avgTicket, prevAvgTicket),
    },
  };
}

// Cards da visão geral: hoje, últimos 7 dias e mês atual, cada um comparado
// ao período anterior equivalente (ontem, 7 dias anteriores, mesmo trecho do
// mês passado) — FR-010.
export async function getOverviewStats(referenceKey = dayKey()) {
  const todayKey = referenceKey;
  const monthStartKey = `${todayKey.slice(0, 8)}01`;
  const dayOfMonth = Number(todayKey.slice(8, 10));

  const prevMonthStartKey = addDays(monthStartKey, -1).slice(0, 8) + "01";
  const prevMonthEndSameSpan = addDays(prevMonthStartKey, dayOfMonth - 1);
  const prevMonthLastDay = addDays(monthStartKey, -1);
  // Mesmo trecho do mês anterior, sem transbordar para o mês atual
  // (ex.: dia 31 vs fevereiro).
  const prevMonthEndKey =
    prevMonthEndSameSpan <= prevMonthLastDay ? prevMonthEndSameSpan : prevMonthLastDay;

  const rangeStart = [prevMonthStartKey, addDays(todayKey, -13)].sort()[0];
  const byDay = await getStatsRange(rangeStart, todayKey);

  const today = sumRange(byDay, todayKey, todayKey);
  const yesterday = sumRange(byDay, addDays(todayKey, -1), addDays(todayKey, -1));

  const last7 = sumRange(byDay, addDays(todayKey, -6), todayKey);
  const prev7 = sumRange(byDay, addDays(todayKey, -13), addDays(todayKey, -7));

  const month = sumRange(byDay, monthStartKey, todayKey);
  const prevMonth = sumRange(byDay, prevMonthStartKey, prevMonthEndKey);

  return {
    today: withDerived(today, yesterday),
    last7Days: withDerived(last7, prev7),
    currentMonth: withDerived(month, prevMonth),
  };
}

// Série do gráfico: um ponto por dia (dias sem vendas viram zero, mantendo o
// eixo contínuo) — FR-011.
export async function getSalesSeries(fromKey, toKey) {
  if (!fromKey || !toKey || fromKey > toKey) {
    const error = new Error("Período inválido.");
    error.code = "periodo-invalido";
    throw error;
  }

  const byDay = await getStatsRange(fromKey, toKey);
  const series = [];

  for (let key = fromKey; key <= toKey; key = addDays(key, 1)) {
    const stats = byDay.get(key) || emptyTotals();

    series.push({ date: key, revenue: stats.revenue || 0, orderCount: stats.orderCount || 0 });
  }

  return series;
}

// Top produtos do período: consolidação client-side dos mapas diários (R-2).
export async function getTopProducts(fromKey, toKey, topLimit = 5) {
  const byDay = await getStatsRange(fromKey, toKey);
  const totals = new Map();

  for (const stats of byDay.values()) {
    for (const [productId, entry] of Object.entries(stats.unitsByProduct || {})) {
      const current = totals.get(productId) || { productId, name: entry.name, units: 0 };

      current.units += entry.units;
      current.name = entry.name;
      totals.set(productId, current);
    }
  }

  return [...totals.values()].sort((a, b) => b.units - a.units).slice(0, topLimit);
}

// Relatório ampliado do período (feature 018): uma única range query cobre o
// período E o período anterior de mesma duração (estende o `from` para trás),
// para os KPIs comparativos — mantendo a regra de só ler dailyStats (Const. IV).
export async function getPeriodReport(fromKey, toKey) {
  if (!fromKey || !toKey || fromKey > toKey) {
    const error = new Error("Período inválido.");
    error.code = "periodo-invalido";
    throw error;
  }

  // Lista de dias do período e do período anterior de mesma duração.
  const days = [];
  for (let key = fromKey; key <= toKey; key = addDays(key, 1)) {
    days.push(key);
  }

  const prevTo = addDays(fromKey, -1);
  const prevFrom = addDays(prevTo, -(days.length - 1));
  const prevDays = [];
  for (let key = prevFrom; key <= prevTo; key = addDays(key, 1)) {
    prevDays.push(key);
  }

  const byDay = await getStatsRange(prevFrom, toKey);

  const current = sumPeriod(byDay, days);
  const previous = sumPeriod(byDay, prevDays);

  const series = days.map((date) => {
    const stats = byDay.get(date) || emptyTotals();
    return { date, revenue: stats.revenue || 0, orderCount: stats.orderCount || 0 };
  });

  // Faturamento por categoria (forward-only) do período atual, ordenado desc.
  const byCategoryRevenue = Object.values(current.byCategory)
    .map((c) => ({ name: c.name, revenue: c.revenue, units: c.units }))
    .sort((a, b) => b.revenue - a.revenue);

  // 1º dia do período que já tem os campos novos (aviso de forward-only).
  const coverageStart =
    days.find((date) => {
      const stats = byDay.get(date);
      return stats && stats.byPaymentMethod && Object.keys(stats.byPaymentMethod).length > 0;
    }) || null;

  return {
    kpis: periodKpis(current, previous),
    series,
    byCategoryRevenue,
    paymentMix: mixDistribution(current.byPaymentMethod),
    deliveryMix: mixDistribution(current.byDeliveryMethod),
    coverageStart,
  };
}

export async function getRecentOrders(count = 5) {
  const snapshot = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(count))
  );

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

// Alertas acionáveis (FR-014): cada lista com limit — nada de varredura.
export async function getAlerts() {
  const [stockSnap, awaitingSnap, incompleteSnap, inconsistentSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "products"),
        where("deleted", "==", false),
        where("totalStock", "<=", LOW_STOCK_FETCH_CAP),
        orderBy("totalStock", "asc"),
        limit(25)
      )
    ),
    getDocs(
      query(
        collection(db, "orders"),
        where("status", "in", [ORDER_STATUS.PAGO, ORDER_STATUS.EM_SEPARACAO]),
        orderBy("createdAt", "asc"),
        limit(5)
      )
    ),
    getDocs(
      query(
        collection(db, "products"),
        where("deleted", "==", false),
        where("incomplete", "==", true),
        limit(5)
      )
    ),
    // Produtos OCULTOS da vitrine por inconsistência de variação (feature 008,
    // FR-017a) — alerta impossível de ignorar até o lojista corrigir.
    getDocs(
      query(
        collection(db, "products"),
        where("deleted", "==", false),
        where("variationsInconsistent", "==", true),
        limit(25)
      )
    ),
  ]);

  const stockProducts = stockSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    outOfStock: stockProducts.filter((p) => (p.totalStock || 0) === 0).slice(0, 5),
    lowStock: stockProducts
      .filter(
        (p) =>
          (p.totalStock || 0) > 0 &&
          p.totalStock <= (p.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)
      )
      .slice(0, 5),
    awaitingShipment: awaitingSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    incompleteProducts: incompleteSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    inconsistentVariations: inconsistentSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}
