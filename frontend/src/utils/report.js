// Cálculos dos relatórios ampliados (feature 018) — funções puras sobre os
// agregados de `dailyStats`. Sem I/O; testáveis isoladamente.

// Soma os agregados de um mapa dia→stats no intervalo [fromKey, toKey]
// (chaves yyyy-mm-dd). `dayKeys` é a lista ordenada de dias a percorrer.
export function sumPeriod(byDay, dayKeys) {
  const totals = {
    revenue: 0,
    orderCount: 0,
    unitsSold: 0,
    discountTotal: 0,
    byCategory: {},
    byPaymentMethod: {},
    byDeliveryMethod: {},
  };

  for (const key of dayKeys) {
    const stats = byDay.get(key);
    if (!stats) {
      continue;
    }

    totals.revenue += stats.revenue || 0;
    totals.orderCount += stats.orderCount || 0;
    totals.unitsSold += stats.unitsSold || 0;
    totals.discountTotal += stats.discountTotal || 0;

    for (const [id, entry] of Object.entries(stats.byCategory || {})) {
      const cur = totals.byCategory[id] || { name: entry.name, revenue: 0, units: 0 };
      cur.name = entry.name || cur.name;
      cur.revenue += entry.revenue || 0;
      cur.units += entry.units || 0;
      totals.byCategory[id] = cur;
    }

    for (const [k, n] of Object.entries(stats.byPaymentMethod || {})) {
      totals.byPaymentMethod[k] = (totals.byPaymentMethod[k] || 0) + n;
    }
    for (const [k, n] of Object.entries(stats.byDeliveryMethod || {})) {
      totals.byDeliveryMethod[k] = (totals.byDeliveryMethod[k] || 0) + n;
    }
  }

  return totals;
}

function pctDelta(current, previous) {
  if (!previous) {
    return null; // sem base de comparação — a UI mostra "—"
  }
  return ((current - previous) / previous) * 100;
}

// KPIs do período + variação % vs. o período anterior de mesma duração.
export function periodKpis(current, previous) {
  const avgTicket = current.orderCount > 0 ? Math.round(current.revenue / current.orderCount) : 0;
  const prevAvgTicket =
    previous.orderCount > 0 ? Math.round(previous.revenue / previous.orderCount) : 0;

  return {
    revenue: current.revenue,
    orderCount: current.orderCount,
    unitsSold: current.unitsSold,
    discountTotal: current.discountTotal,
    avgTicket,
    deltas: {
      revenue: pctDelta(current.revenue, previous.revenue),
      orderCount: pctDelta(current.orderCount, previous.orderCount),
      unitsSold: pctDelta(current.unitsSold, previous.unitsSold),
      avgTicket: pctDelta(avgTicket, prevAvgTicket),
    },
  };
}

// Unidades por categoria (retroativo): cruza o top (productId→units) com o
// catálogo. Produtos sem categoria caem em "Sem categoria". Ordenado desc.
export function unitsByCategory(topProducts, productsById) {
  const groups = new Map();

  for (const item of topProducts) {
    const product = productsById.get(item.productId);
    const name = product?.categoryName || product?.category || "Sem categoria";
    const key = name;

    groups.set(key, (groups.get(key) || 0) + item.units);
  }

  return [...groups.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units);
}

// Distribuição (contagem + %) de um mapa de contagens. Ordenado desc.
export function mixDistribution(counts) {
  const entries = Object.entries(counts || {});
  const total = entries.reduce((sum, [, n]) => sum + n, 0);

  return entries
    .map(([key, count]) => ({ key, count, pct: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}
