import { describe, it, expect, vi, beforeEach } from "vitest";

const getDocMock = vi.fn();
const getDocsMock = vi.fn();
const whereMock = vi.fn((field, op, value) => ({ type: "where", field, op, value }));
const orderByMock = vi.fn((field, direction) => ({ type: "orderBy", field, direction }));
const limitMock = vi.fn((n) => ({ type: "limit", n }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((db, name) => ({ collectionName: name })),
  doc: vi.fn((db, collectionName, id) => ({ collectionName, id })),
  getDoc: (...args) => getDocMock(...args),
  getDocs: (...args) => getDocsMock(...args),
  limit: (...args) => limitMock(...args),
  orderBy: (...args) => orderByMock(...args),
  query: vi.fn((col, ...constraints) => ({ col, constraints })),
  startAfter: vi.fn((snap) => ({ type: "startAfter", snap })),
  where: (...args) => whereMock(...args),
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import { listCustomers, getCustomerOrders } from "../customerService";

function snapshotWith(docs) {
  return { docs: docs.map(([id, data]) => ({ id, data: () => data })) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getDocsMock.mockReset();
});

describe("listCustomers", () => {
  it("sempre filtra role == customer (nunca lista admins)", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([["u1", { name: "Maria" }]]));

    await listCustomers({});

    expect(whereMock).toHaveBeenCalledWith("role", "==", "customer");
  });

  it("pagina com limit(pageSize + 1) e reporta hasMore", async () => {
    const docs = Array.from({ length: 21 }, (_, i) => [`u${i}`, { name: `Cliente ${i}` }]);
    getDocsMock.mockResolvedValueOnce(snapshotWith(docs));

    const result = await listCustomers({});

    expect(limitMock).toHaveBeenCalledWith(21);
    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });

  it("busca por prefixo de nome E e-mail, mesclando sem duplicar", async () => {
    getDocsMock
      .mockResolvedValueOnce(snapshotWith([["u1", { name: "Maria" }]]))
      .mockResolvedValueOnce(snapshotWith([["u1", { name: "Maria" }], ["u2", { email: "maria2@x.com" }]]));

    const result = await listCustomers({ search: "Maria" });

    expect(result.items).toHaveLength(2);
    expect(whereMock).toHaveBeenCalledWith("nameLower", ">=", "maria");
    expect(whereMock).toHaveBeenCalledWith("email", ">=", "maria");
  });

  it("ordenação restrita aos campos indexados (campo cai para createdAt, direção é mantida)", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([]));

    await listCustomers({ sort: { key: "orderCount", direction: "asc" } });

    expect(orderByMock).toHaveBeenCalledWith("createdAt", "asc");
  });
});

describe("getCustomerOrders", () => {
  it("consulta pedidos do cliente ordenados por data", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([["o1", { orderNumber: 1 }]]));

    const result = await getCustomerOrders("uid-1");

    expect(whereMock).toHaveBeenCalledWith("customerId", "==", "uid-1");
    expect(orderByMock).toHaveBeenCalledWith("createdAt", "desc");
    expect(result.items[0].orderNumber).toBe(1);
  });
});
