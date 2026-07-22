import { describe, it, expect } from "vitest";

import { sumPeriod, periodKpis, unitsByCategory, mixDistribution } from "../report";

describe("sumPeriod", () => {
  it("soma os agregados (novos inclusive) no intervalo, ignorando dias ausentes", () => {
    const byDay = new Map([
      [
        "2026-07-19",
        {
          revenue: 10000,
          orderCount: 2,
          unitsSold: 3,
          discountTotal: 500,
          byCategory: { "cat-1": { name: "A", revenue: 6000, units: 2 } },
          byPaymentMethod: { pix: 2 },
          byDeliveryMethod: { entrega: 2 },
        },
      ],
      [
        "2026-07-20",
        {
          revenue: 5000,
          orderCount: 1,
          unitsSold: 1,
          discountTotal: 0,
          byCategory: { "cat-1": { name: "A", revenue: 4000, units: 1 }, "cat-2": { name: "B", revenue: 1000, units: 1 } },
          byPaymentMethod: { cartao: 1 },
          byDeliveryMethod: { retirada: 1 },
        },
      ],
    ]);

    const totals = sumPeriod(byDay, ["2026-07-19", "2026-07-20", "2026-07-21"]);

    expect(totals.revenue).toBe(15000);
    expect(totals.orderCount).toBe(3);
    expect(totals.discountTotal).toBe(500);
    expect(totals.byCategory["cat-1"]).toEqual({ name: "A", revenue: 10000, units: 3 });
    expect(totals.byCategory["cat-2"].revenue).toBe(1000);
    expect(totals.byPaymentMethod).toEqual({ pix: 2, cartao: 1 });
    expect(totals.byDeliveryMethod).toEqual({ entrega: 2, retirada: 1 });
  });
});

describe("periodKpis", () => {
  it("ticket médio e deltas vs. período anterior", () => {
    const current = { revenue: 10000, orderCount: 2, unitsSold: 4, discountTotal: 0 };
    const previous = { revenue: 5000, orderCount: 1, unitsSold: 1, discountTotal: 0 };

    const kpis = periodKpis(current, previous);

    expect(kpis.avgTicket).toBe(5000); // 10000/2
    expect(kpis.deltas.revenue).toBe(100); // +100%
    expect(kpis.deltas.orderCount).toBe(100);
  });

  it("sem base de comparação → delta null", () => {
    const kpis = periodKpis(
      { revenue: 10000, orderCount: 2, unitsSold: 4, discountTotal: 0 },
      { revenue: 0, orderCount: 0, unitsSold: 0, discountTotal: 0 }
    );

    expect(kpis.deltas.revenue).toBeNull();
    expect(kpis.avgTicket).toBe(5000);
  });
});

describe("unitsByCategory", () => {
  it("agrupa por categoria do catálogo, ordena desc e usa 'Sem categoria'", () => {
    const top = [
      { productId: "p1", units: 5 },
      { productId: "p2", units: 3 },
      { productId: "p3", units: 2 }, // sem produto no catálogo → Sem categoria
    ];
    const productsById = new Map([
      ["p1", { categoryName: "Calçados" }],
      ["p2", { categoryName: "Calçados" }],
    ]);

    const rows = unitsByCategory(top, productsById);

    expect(rows[0]).toEqual({ name: "Calçados", units: 8 });
    expect(rows[1]).toEqual({ name: "Sem categoria", units: 2 });
  });
});

describe("mixDistribution", () => {
  it("contagem + % ordenado desc", () => {
    const rows = mixDistribution({ pix: 3, cartao: 1 });

    expect(rows[0]).toEqual({ key: "pix", count: 3, pct: 75 });
    expect(rows[1]).toEqual({ key: "cartao", count: 1, pct: 25 });
  });

  it("mapa vazio → lista vazia", () => {
    expect(mixDistribution({})).toEqual([]);
  });
});
