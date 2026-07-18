import { describe, it, expect, vi, beforeEach } from "vitest";

let store;

function ts(n) {
  return { toMillis: () => n };
}

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, name, id) => ({ path: `${name}/${id}` })),
  getDoc: vi.fn(async (ref) => {
    const v = store.get(ref.path);
    return { exists: () => v !== undefined, id: ref.path.slice(ref.path.indexOf("/") + 1), data: () => v };
  }),
  getDocs: vi.fn(async (q) => {
    const col = q.__collection;
    let rows = [...store.entries()]
      .filter(([k]) => k.startsWith(col + "/"))
      .map(([k, v]) => ({ id: k.slice(col.length + 1), data: () => v, _d: v }));

    for (const c of q.constraints || []) {
      if (c.type === "where" && c.op === "==") rows = rows.filter((r) => r._d[c.field] === c.value);
      if (c.type === "where" && c.op === "array-contains")
        rows = rows.filter((r) => Array.isArray(r._d[c.field]) && r._d[c.field].includes(c.value));
    }
    const ob = (q.constraints || []).find((c) => c.type === "orderBy");
    if (ob) {
      rows.sort((a, b) => {
        const av = a._d[ob.field]?.toMillis?.() ?? 0;
        const bv = b._d[ob.field]?.toMillis?.() ?? 0;
        return ob.direction === "desc" ? bv - av : av - bv;
      });
    }
    const sa = (q.constraints || []).find((c) => c.type === "startAfter");
    if (sa) {
      const idx = rows.findIndex((r) => r.id === sa.cursorId);
      if (idx >= 0) rows = rows.slice(idx + 1);
    }
    const lim = (q.constraints || []).find((c) => c.type === "limit");
    if (lim) rows = rows.slice(0, lim.n);
    return { docs: rows };
  }),
  setDoc: vi.fn(async (ref, data, opts) => {
    const prev = opts?.merge ? store.get(ref.path) || {} : {};
    store.set(ref.path, { ...prev, ...data });
  }),
  updateDoc: vi.fn(async (ref, changes) => {
    store.set(ref.path, { ...store.get(ref.path), ...changes });
  }),
  deleteDoc: vi.fn(async (ref) => {
    store.delete(ref.path);
  }),
  query: vi.fn((col, ...constraints) => ({ __collection: col.__collection, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  limit: vi.fn((n) => ({ type: "limit", n })),
  startAfter: vi.fn((cursor) => ({ type: "startAfter", cursorId: cursor?.id })),
  serverTimestamp: () => "server-timestamp",
}));

vi.mock("../../firebase/firestore", () => ({ default: {} }));

import {
  submitReview,
  getMyReview,
  getApprovedReviews,
  hasPurchased,
  approveReview,
  hideReview,
  deleteReview,
} from "../reviewService";

beforeEach(() => {
  store = new Map();
  store.set("products/prod-1", { name: "Tênis", ratingAvg: 0, ratingCount: 0 });
});

describe("reviewService — cliente", () => {
  it("submitReview grava id determinístico, status pendente e createdAt na criação", async () => {
    await submitReview({ productId: "prod-1", uid: "u1", userName: "Ana", rating: 4, comment: " bom " });

    const r = store.get("reviews/prod-1_u1");
    expect(r.status).toBe("pendente");
    expect(r.rating).toBe(4);
    expect(r.comment).toBe("bom"); // aparado
    expect(r.userId).toBe("u1");
    expect(r.createdAt).toBe("server-timestamp");
  });

  it("editar mantém o mesmo doc e volta a pendente", async () => {
    await submitReview({ productId: "prod-1", uid: "u1", userName: "Ana", rating: 4 });
    await submitReview({ productId: "prod-1", uid: "u1", userName: "Ana", rating: 5 });

    expect(store.get("reviews/prod-1_u1").rating).toBe(5);
    expect(store.get("reviews/prod-1_u1").status).toBe("pendente");
    expect([...store.keys()].filter((k) => k.startsWith("reviews/")).length).toBe(1);
  });

  it("getMyReview retorna a própria ou null", async () => {
    await submitReview({ productId: "prod-1", uid: "u1", userName: "Ana", rating: 4 });
    expect((await getMyReview("prod-1", "u1")).rating).toBe(4);
    expect(await getMyReview("prod-1", "u2")).toBeNull();
    expect(await getMyReview("prod-1", null)).toBeNull();
  });
});

describe("reviewService — hasPurchased", () => {
  it("true quando há pedido não cancelado com o produto", async () => {
    store.set("orders/o1", { customerId: "u1", productIds: ["prod-1"], status: "pago" });
    expect(await hasPurchased("u1", "prod-1")).toBe(true);
  });

  it("false quando só há pedido cancelado, ou nenhum, ou sem uid", async () => {
    store.set("orders/o1", { customerId: "u1", productIds: ["prod-1"], status: "cancelado" });
    expect(await hasPurchased("u1", "prod-1")).toBe(false);
    expect(await hasPurchased("u2", "prod-1")).toBe(false);
    expect(await hasPurchased(null, "prod-1")).toBe(false);
  });
});

describe("reviewService — moderação recalcula a média (só aprovadas)", () => {
  beforeEach(() => {
    store.set("reviews/prod-1_u1", { productId: "prod-1", userId: "u1", rating: 4, status: "pendente", createdAt: ts(1) });
    store.set("reviews/prod-1_u2", { productId: "prod-1", userId: "u2", rating: 5, status: "aprovada", createdAt: ts(2) });
  });

  it("aprovar recalcula ratingAvg/ratingCount com as aprovadas", async () => {
    await approveReview("prod-1_u1"); // agora as duas aprovadas (4 e 5)

    const p = store.get("products/prod-1");
    expect(p.ratingCount).toBe(2);
    expect(p.ratingAvg).toBe(4.5);
  });

  it("ocultar uma aprovada remove-a da média", async () => {
    await hideReview("prod-1_u2"); // sobra nenhuma aprovada

    const p = store.get("products/prod-1");
    expect(p.ratingCount).toBe(0);
    expect(p.ratingAvg).toBe(0);
  });

  it("remover apaga o doc e recalcula", async () => {
    await deleteReview("prod-1_u2");

    expect(store.get("reviews/prod-1_u2")).toBeUndefined();
    expect(store.get("products/prod-1").ratingCount).toBe(0);
  });
});

describe("reviewService — getApprovedReviews pagina", () => {
  beforeEach(() => {
    for (let i = 1; i <= 3; i += 1) {
      store.set(`reviews/prod-1_u${i}`, {
        productId: "prod-1",
        userId: `u${i}`,
        rating: 5,
        status: "aprovada",
        createdAt: ts(i),
      });
    }
    store.set("reviews/prod-1_ux", { productId: "prod-1", userId: "ux", rating: 1, status: "pendente", createdAt: ts(9) });
  });

  it("retorna só aprovadas, paginado com hasMore/nextCursor", async () => {
    const page1 = await getApprovedReviews("prod-1", { pageSize: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await getApprovedReviews("prod-1", { pageSize: 2, cursor: page1.nextCursor });
    expect(page2.items).toHaveLength(1); // a 3ª aprovada; a pendente não entra
    expect(page2.hasMore).toBe(false);
  });
});
