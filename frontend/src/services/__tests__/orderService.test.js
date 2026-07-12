import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock transacional em memória: store path→doc, transações SERIALIZADAS por
// fila (emula o comportamento do runTransaction real, em que transações
// concorrentes são reexecutadas e enxergam o estado commitado da anterior).
// Nota (tasks.md T036): valida a lógica de validação/aborto — a semântica
// real de retry exige emulador (melhoria futura).
// ---------------------------------------------------------------------------

let store;
let autoId;
let txQueue = Promise.resolve();

function getPath(ref) {
  return ref.path;
}

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((dbArg, name) => ({ __collection: name })),
  doc: vi.fn((first, second, third) => {
    if (first && first.__collection) {
      return { path: `${first.__collection}/auto-${++autoId}` };
    }

    return { path: `${second}/${third}` };
  }),
  runTransaction: vi.fn((dbArg, fn) => {
    const run = txQueue.then(() =>
      fn({
        get: async (ref) => {
          const data = store.get(getPath(ref));

          return { exists: () => data !== undefined, data: () => data };
        },
        set: (ref, data) => {
          store.set(getPath(ref), data);
        },
        update: (ref, changes) => {
          store.set(getPath(ref), { ...store.get(getPath(ref)), ...changes });
        },
      })
    );

    // Serializa a próxima transação após esta terminar (sucesso ou erro).
    txQueue = run.then(
      () => undefined,
      () => undefined
    );

    return run;
  }),
  getDoc: vi.fn(async (ref) => {
    const data = store.get(getPath(ref));

    return { exists: () => data !== undefined, data: () => data, id: getPath(ref).split("/")[1] };
  }),
  getDocs: vi.fn(),
  updateDoc: vi.fn(async (ref, changes) => {
    store.set(getPath(ref), { ...store.get(getPath(ref)), ...changes });
  }),
  query: vi.fn((col, ...constraints) => ({ col, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  limit: vi.fn((n) => ({ type: "limit", n })),
  startAfter: vi.fn(),
  Timestamp: {
    now: () => ({ __timestamp: true, toDate: () => new Date() }),
    fromDate: (date) => ({ __timestamp: true, toDate: () => date }),
  },
  serverTimestamp: () => "server-timestamp",
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import { createOrder, advanceStatus, cancelOrder, getOrder, listOrders } from "../orderService";
import { updateProduct } from "../productService";
import { ORDER_STATUS } from "../../constants/orderStatus";
import { getDocs, where } from "firebase/firestore";

function seedStore() {
  store = new Map();
  autoId = 0;

  store.set("users/cliente-1", {
    name: "Maria Silva",
    email: "maria@exemplo.com",
    role: "customer",
    orderCount: 0,
    totalSpent: 0,
  });

  store.set("products/prod-1", {
    name: "Tênis Nike Air Max",
    price: 19990,
    stock: 1,
    totalStock: 1,
    variations: [],
    status: "ativo",
    deleted: false,
    image: "https://img/tenis.jpg",
  });

  store.set("products/prod-2", {
    name: "Camiseta Básica",
    price: 4990,
    stock: 10,
    totalStock: 12,
    variations: [{ id: "v1", attributes: { tamanho: "M" }, sku: "CAM-M", price: null, stock: 2 }],
    status: "ativo",
    deleted: false,
    image: "",
  });
}

function findOrderPath() {
  return [...store.keys()].find((key) => key.startsWith("orders/"));
}

beforeEach(() => {
  seedStore();
});

describe("createOrder — transação de criação", () => {
  it("baixa estoque, congela itens, numera sequencialmente e agrega dailyStats + cliente", async () => {
    const result = await createOrder({
      customerId: "cliente-1",
      items: [
        { productId: "prod-1", quantity: 1 },
        { productId: "prod-2", variationId: "v1", quantity: 2 },
      ],
      shippingAddress: { cidade: "São Paulo", uf: "SP" },
      paymentMethod: "pix",
    });

    expect(result.orderNumber).toBe(1);

    // Estoque decrementado (produto simples e variação)
    expect(store.get("products/prod-1").stock).toBe(0);
    expect(store.get("products/prod-1").totalStock).toBe(0);
    expect(store.get("products/prod-2").variations[0].stock).toBe(0);
    expect(store.get("products/prod-2").totalStock).toBe(10);

    // Pedido com itens congelados e productIds p/ soft delete
    const order = store.get(findOrderPath());

    expect(order.total).toBe(19990 + 2 * 4990);
    expect(order.items[0]).toMatchObject({ name: "Tênis Nike Air Max", unitPrice: 19990 });
    expect(order.items[1]).toMatchObject({ variationLabel: "M", unitPrice: 4990, quantity: 2 });
    expect(order.productIds).toEqual(["prod-1", "prod-2"]);
    expect(order.status).toBe(ORDER_STATUS.AGUARDANDO_PAGAMENTO);

    // Contador, dailyStats e agregados do cliente na MESMA transação
    expect(store.get("counters/orders").current).toBe(1);

    const statsPath = [...store.keys()].find((key) => key.startsWith("dailyStats/"));
    const stats = store.get(statsPath);

    expect(stats.revenue).toBe(order.total);
    expect(stats.orderCount).toBe(1);
    expect(stats.unitsSold).toBe(3);
    expect(stats.unitsByProduct["prod-1"].units).toBe(1);

    const customer = store.get("users/cliente-1");

    expect(customer.orderCount).toBe(1);
    expect(customer.totalSpent).toBe(order.total);
  });

  it("compra simultânea da última unidade: 1 sucesso, 1 estoque-insuficiente, estoque final 0 (SC-006)", async () => {
    const buy = () =>
      createOrder({
        customerId: "cliente-1",
        items: [{ productId: "prod-1", quantity: 1 }],
        paymentMethod: "pix",
      });

    const results = await Promise.allSettled([buy(), buy()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason.code).toBe("estoque-insuficiente");

    expect(store.get("products/prod-1").stock).toBe(0);
    expect(store.get("products/prod-1").totalStock).toBe(0);
  });

  it("produto inativo/excluído aborta a transação inteira sem efeitos parciais", async () => {
    store.set("products/prod-1", { ...store.get("products/prod-1"), status: "inativo" });

    await expect(
      createOrder({
        customerId: "cliente-1",
        items: [
          { productId: "prod-2", variationId: "v1", quantity: 1 },
          { productId: "prod-1", quantity: 1 },
        ],
        paymentMethod: "pix",
      })
    ).rejects.toMatchObject({ code: "produto-indisponivel" });

    // Nada foi escrito: estoque intacto, sem pedido, sem stats
    expect(store.get("products/prod-2").variations[0].stock).toBe(2);
    expect(findOrderPath()).toBeUndefined();
    expect(store.get("counters/orders")).toBeUndefined();
  });
});

describe("advanceStatus — transições validadas (FR-051)", () => {
  async function createTestOrder() {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
    });

    return findOrderPath().split("/")[1];
  }

  it("bloqueia transição fora da sequência (aguardando → entregue)", async () => {
    const orderId = await createTestOrder();

    await expect(
      advanceStatus(orderId, ORDER_STATUS.ENTREGUE, { byUid: "admin-1", byName: "Admin" })
    ).rejects.toMatchObject({ code: "transicao-invalida" });
  });

  it("registra autor e data no histórico a cada avanço (SC-008)", async () => {
    const orderId = await createTestOrder();

    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "admin-1", byName: "Admin" });

    const order = store.get(`orders/${orderId}`);

    expect(order.status).toBe(ORDER_STATUS.PAGO);
    expect(order.statusHistory).toHaveLength(2);
    expect(order.statusHistory[1]).toMatchObject({
      status: ORDER_STATUS.PAGO,
      byUid: "admin-1",
      byName: "Admin",
    });
    expect(order.statusHistory[1].at.__timestamp).toBe(true);
  });

  it("bloqueia cancelado/devolvido pelo avanço comum (estoque seria esquecido)", async () => {
    const orderId = await createTestOrder();

    await expect(
      advanceStatus(orderId, ORDER_STATUS.CANCELADO, { byUid: "a", byName: "A" })
    ).rejects.toMatchObject({ code: "transicao-invalida" });
  });
});

describe("cancelOrder — atomicidade (SC-009)", () => {
  async function createTestOrder() {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
    });

    return findOrderPath().split("/")[1];
  }

  it("exige motivo", async () => {
    const orderId = await createTestOrder();

    await expect(
      cancelOrder(orderId, { reason: "  ", byUid: "admin-1", byName: "Admin" })
    ).rejects.toMatchObject({ code: "motivo-obrigatorio" });
  });

  it("devolve estoque + histórico + dailyStats + agregados do cliente na mesma transação", async () => {
    const orderId = await createTestOrder();
    const statsPath = [...store.keys()].find((key) => key.startsWith("dailyStats/"));

    await cancelOrder(orderId, {
      reason: "Cliente desistiu",
      byUid: "admin-1",
      byName: "Admin",
    });

    const order = store.get(`orders/${orderId}`);
    const stats = store.get(statsPath);
    const customer = store.get("users/cliente-1");

    expect(order.status).toBe(ORDER_STATUS.CANCELADO);
    expect(order.statusHistory.at(-1)).toMatchObject({ reason: "Cliente desistiu" });
    expect(store.get("products/prod-1").stock).toBe(1);
    expect(store.get("products/prod-1").totalStock).toBe(1);
    expect(stats.revenue).toBe(0);
    expect(stats.orderCount).toBe(0);
    expect(customer.orderCount).toBe(0);
    expect(customer.totalSpent).toBe(0);
  });

  it("bloqueia cancelamento de pedido já enviado", async () => {
    const orderId = await createTestOrder();

    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "a", byName: "A" });
    await advanceStatus(orderId, ORDER_STATUS.EM_SEPARACAO, { byUid: "a", byName: "A" });
    await advanceStatus(orderId, ORDER_STATUS.ENVIADO, { byUid: "a", byName: "A" });

    await expect(
      cancelOrder(orderId, { reason: "Tarde demais", byUid: "a", byName: "A" })
    ).rejects.toMatchObject({ code: "transicao-invalida" });

    // Estoque NÃO devolvido (transação abortou)
    expect(store.get("products/prod-1").stock).toBe(0);
  });
});

describe("listOrders — busca por cliente (nome E e-mail)", () => {
  function searchSnapshot(docs) {
    return { docs: docs.map(([id, data]) => ({ id, data: () => data })) };
  }

  it("cria pedido com customerEmailLower desnormalizado", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
    });

    const order = store.get(findOrderPath());

    expect(order.customerEmailLower).toBe("maria@exemplo.com");
    expect(order.customerNameLower).toBe("maria silva");
  });

  it("encontra por prefixo do nome", async () => {
    getDocs
      .mockResolvedValueOnce(searchSnapshot([["o1", { customerName: "Maria Silva" }]]))
      .mockResolvedValueOnce(searchSnapshot([]));

    const result = await listOrders({ search: "Maria" });

    expect(result.items).toHaveLength(1);
    expect(where).toHaveBeenCalledWith("customerNameLower", ">=", "maria");
    expect(where).toHaveBeenCalledWith("customerEmailLower", ">=", "maria");
  });

  it("encontra por prefixo do e-mail (o que a coluna exibe quando não há nome)", async () => {
    getDocs
      .mockResolvedValueOnce(searchSnapshot([]))
      .mockResolvedValueOnce(searchSnapshot([["o2", { customerEmail: "teste@teste.com" }]]));

    const result = await listOrders({ search: "teste@tes" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].customerEmail).toBe("teste@teste.com");
    expect(where).toHaveBeenCalledWith("customerEmailLower", ">=", "teste@tes");
  });

  it("mescla os dois ramos sem duplicar pedido que casa em ambos", async () => {
    getDocs
      .mockResolvedValueOnce(searchSnapshot([["o3", { customerName: "Ana" }]]))
      .mockResolvedValueOnce(searchSnapshot([["o3", { customerName: "Ana" }]]));

    const result = await listOrders({ search: "ana" });

    expect(result.items).toHaveLength(1);
  });
});

describe("preço congelado (SC-007)", () => {
  it("alterar o preço do produto não muda o pedido existente", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
    });

    const orderId = findOrderPath().split("/")[1];

    // Admin muda o preço do produto (updateProduct real do productService,
    // apontando para o mesmo store via getDoc/updateDoc mockados)
    await updateProduct("prod-1", { price: 29990 });

    expect(store.get("products/prod-1").price).toBe(29990);

    const order = await getOrder(orderId);

    expect(order.items[0].unitPrice).toBe(19990);
    expect(order.total).toBe(19990);
  });
});
