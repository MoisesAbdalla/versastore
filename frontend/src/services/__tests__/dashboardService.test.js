import { describe, it, expect, vi, beforeEach } from "vitest";

const getDocsMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((db, name) => ({ collectionName: name })),
  documentId: vi.fn(() => "__name__"),
  getDocs: (...args) => getDocsMock(...args),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn((field, op, value) => ({ field, op, value })),
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import { getOverviewStats, getSalesSeries, getTopProducts } from "../dashboardService";

function statsDocs(entries) {
  return {
    docs: Object.entries(entries).map(([id, data]) => ({ id, data: () => data })),
  };
}

function day(revenue, orderCount = 1, unitsSold = 1, unitsByProduct = {}) {
  return { revenue, orderCount, unitsSold, unitsByProduct };
}

beforeEach(() => {
  getDocsMock.mockReset();
});

describe("getOverviewStats — deltas vs. período anterior equivalente", () => {
  it("calcula hoje vs. ontem, 7 vs. 7 anteriores e mês vs. mesmo trecho do mês passado", async () => {
    getDocsMock.mockResolvedValueOnce(
      statsDocs({
        // mês passado (mesmo trecho: 01..12/06)
        "2026-06-05": day(10000, 2, 3),
        "2026-06-10": day(10000, 2, 3),
        // 7 dias anteriores (29/06..05/07)
        "2026-07-01": day(20000, 4, 5),
        // últimos 7 dias (06..12/07)
        "2026-07-08": day(30000, 3, 4),
        // ontem
        "2026-07-11": day(10000, 1, 2),
        // hoje
        "2026-07-12": day(20000, 2, 2),
      })
    );

    const stats = await getOverviewStats("2026-07-12");

    // hoje 20000 vs ontem 10000 → +100%
    expect(stats.today.revenue).toBe(20000);
    expect(stats.today.deltas.revenue).toBeCloseTo(100);

    // últimos 7 dias: 08 + 11 + 12/07 = 60000; anteriores: 01/07 = 20000 → +200%
    expect(stats.last7Days.revenue).toBe(60000);
    expect(stats.last7Days.deltas.revenue).toBeCloseTo(200);

    // mês: 01..12/07 = 20000+30000+10000+20000 = 80000; mês passado mesmo
    // trecho (01..12/06) = 20000 → +300%
    expect(stats.currentMonth.revenue).toBe(80000);
    expect(stats.currentMonth.deltas.revenue).toBeCloseTo(300);

    // ticket médio do mês: 80000 / 10 pedidos = 8000
    expect(stats.currentMonth.avgTicket).toBe(8000);
  });

  it("delta é null quando o período anterior não tem base de comparação", async () => {
    getDocsMock.mockResolvedValueOnce(statsDocs({ "2026-07-12": day(5000) }));

    const stats = await getOverviewStats("2026-07-12");

    expect(stats.today.deltas.revenue).toBe(null);
    expect(stats.currentMonth.deltas.orderCount).toBe(null);
  });
});

describe("getSalesSeries", () => {
  it("preenche dias sem vendas com zero (eixo contínuo do gráfico)", async () => {
    getDocsMock.mockResolvedValueOnce(
      statsDocs({ "2026-07-10": day(10000), "2026-07-12": day(30000) })
    );

    const series = await getSalesSeries("2026-07-10", "2026-07-12");

    expect(series).toHaveLength(3);
    expect(series[0]).toEqual({ date: "2026-07-10", revenue: 10000, orderCount: 1 });
    expect(series[1]).toEqual({ date: "2026-07-11", revenue: 0, orderCount: 0 });
    expect(series[2]).toEqual({ date: "2026-07-12", revenue: 30000, orderCount: 1 });
  });

  it("rejeita período invertido", async () => {
    await expect(getSalesSeries("2026-07-12", "2026-07-10")).rejects.toMatchObject({
      code: "periodo-invalido",
    });
  });
});

describe("getTopProducts — merge dos mapas diários (R-2)", () => {
  it("soma unidades por produto entre dias e retorna o top ordenado", async () => {
    getDocsMock.mockResolvedValueOnce(
      statsDocs({
        "2026-07-10": day(0, 0, 0, {
          "prod-a": { name: "Tênis", units: 2 },
          "prod-b": { name: "Camiseta", units: 5 },
        }),
        "2026-07-11": day(0, 0, 0, {
          "prod-a": { name: "Tênis", units: 4 },
          "prod-c": { name: "Boné", units: 1 },
        }),
      })
    );

    const top = await getTopProducts("2026-07-10", "2026-07-11", 2);

    expect(top).toEqual([
      { productId: "prod-a", name: "Tênis", units: 6 },
      { productId: "prod-b", name: "Camiseta", units: 5 },
    ]);
  });
});
