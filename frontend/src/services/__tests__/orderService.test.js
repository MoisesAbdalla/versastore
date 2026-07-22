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

import { createOrder, advanceStatus, cancelOrder, getOrder, getMyOrder, listOrders } from "../orderService";
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
  it("baixa estoque, congela itens, numera sequencialmente — SEM agregados na criação (feature 009)", async () => {
    const result = await createOrder({
      customerId: "cliente-1",
      items: [
        { productId: "prod-1", quantity: 1 },
        { productId: "prod-2", variationId: "v1", quantity: 2 },
      ],
      shippingAddress: { cidade: "São Paulo", uf: "SP" },
      paymentMethod: "pix",
      cpf: "529.982.247-25",
    });

    expect(result.orderNumber).toBe(1);

    // Estoque decrementado (produto simples e variação)
    expect(store.get("products/prod-1").stock).toBe(0);
    expect(store.get("products/prod-1").totalStock).toBe(0);
    expect(store.get("products/prod-2").variations[0].stock).toBe(0);
    expect(store.get("products/prod-2").totalStock).toBe(10);

    // Pedido com itens congelados, campos de frete/total e agregados NÃO aplicados
    const order = store.get(findOrderPath());

    expect(order.subtotal).toBe(19990 + 2 * 4990);
    expect(order.shipping).toBe(null);
    expect(order.shippingStatus).toBe("a_calcular");
    expect(order.total).toBe(order.subtotal); // shipping null → total = subtotal
    expect(order.cpf).toBe("529.982.247-25");
    expect(order.aggregatesApplied).toBe(false);
    expect(order.items[0]).toMatchObject({ name: "Tênis Nike Air Max", unitPrice: 19990 });
    expect(order.items[1]).toMatchObject({ variationLabel: "M", unitPrice: 4990, quantity: 2 });
    expect(order.status).toBe(ORDER_STATUS.AGUARDANDO_PAGAMENTO);

    // Contador incrementado, mas dailyStats e totais do cliente INALTERADOS
    expect(store.get("counters/orders").current).toBe(1);
    expect([...store.keys()].some((key) => key.startsWith("dailyStats/"))).toBe(false);

    const customer = store.get("users/cliente-1");
    expect(customer.orderCount).toBe(0);
    expect(customer.totalSpent).toBe(0);
  });

  it("grava o frete calculado (feature 011) congelado no pedido", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      shipping: 1990,
      shippingEtaDays: 5,
      shippingMethod: "Sudeste",
      shippingCep: "01001000",
    });

    const order = store.get(findOrderPath());
    expect(order.shipping).toBe(1990);
    expect(order.shippingStatus).toBe("calculado");
    expect(order.shippingEtaDays).toBe(5);
    expect(order.shippingMethod).toBe("Sudeste");
    expect(order.shippingCep).toBe("01001000");
    expect(order.total).toBe(order.subtotal + 1990);
  });

  it("frete 0 → shippingStatus 'gratis'; sem frete → 'a_calcular'", async () => {
    await createOrder({ customerId: "cliente-1", items: [{ productId: "prod-1", quantity: 1 }], paymentMethod: "pix", shipping: 0 });
    expect(store.get(findOrderPath()).shippingStatus).toBe("gratis");
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

  it("marcar como PAGO aplica os agregados uma única vez (feature 009)", async () => {
    const orderId = await createTestOrder();
    const order = store.get(`orders/${orderId}`);

    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "admin-1", byName: "Admin" });

    const statsPath = [...store.keys()].find((key) => key.startsWith("dailyStats/"));
    expect(store.get(statsPath).revenue).toBe(order.total);
    expect(store.get(statsPath).orderCount).toBe(1);
    expect(store.get("users/cliente-1").orderCount).toBe(1);
    expect(store.get("users/cliente-1").totalSpent).toBe(order.total);
    expect(store.get(`orders/${orderId}`).aggregatesApplied).toBe(true);

    // Avançar para em_separacao NÃO re-aplica (idempotência do agregado)
    await advanceStatus(orderId, ORDER_STATUS.EM_SEPARACAO, { byUid: "admin-1", byName: "Admin" });
    expect(store.get(statsPath).orderCount).toBe(1);
    expect(store.get("users/cliente-1").orderCount).toBe(1);
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

  it("cancelar pedido PENDENTE devolve estoque e NÃO mexe em agregados (feature 009)", async () => {
    const orderId = await createTestOrder(); // aguardando_pagamento, sem agregados

    await cancelOrder(orderId, { reason: "Cliente desistiu", byUid: "admin-1", byName: "Admin" });

    const order = store.get(`orders/${orderId}`);
    const customer = store.get("users/cliente-1");

    expect(order.status).toBe(ORDER_STATUS.CANCELADO);
    expect(order.statusHistory.at(-1)).toMatchObject({ reason: "Cliente desistiu" });
    // Estoque devolvido
    expect(store.get("products/prod-1").stock).toBe(1);
    expect(store.get("products/prod-1").totalStock).toBe(1);
    // Agregados nunca foram somados na criação → seguem zerados; sem dailyStats
    expect([...store.keys()].some((key) => key.startsWith("dailyStats/"))).toBe(false);
    expect(customer.orderCount).toBe(0);
    expect(customer.totalSpent).toBe(0);
  });

  it("cancelar pedido PAGO devolve estoque E reverte agregados (feature 009)", async () => {
    const orderId = await createTestOrder();
    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "admin-1", byName: "Admin" });

    // Após o pago: agregados aplicados
    const statsPath = [...store.keys()].find((key) => key.startsWith("dailyStats/"));
    expect(store.get(statsPath).revenue).toBeGreaterThan(0);
    expect(store.get("users/cliente-1").orderCount).toBe(1);

    await cancelOrder(orderId, { reason: "Estorno", byUid: "admin-1", byName: "Admin" });

    expect(store.get("products/prod-1").stock).toBe(1);
    expect(store.get(statsPath).revenue).toBe(0);
    expect(store.get(statsPath).orderCount).toBe(0);
    expect(store.get("users/cliente-1").orderCount).toBe(0);
    expect(store.get("users/cliente-1").totalSpent).toBe(0);
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

describe("concorrência lojista-edita × cliente-compra (feature 008, R-3)", () => {
  it("variação removida no meio da compra → aborta sem baixar estoque de outra", async () => {
    // O lojista removeu a variação v1 ANTES do commit da transação: o produto
    // agora só tem v-nova. A compra referencia o variationId antigo.
    store.set("products/prod-2", {
      ...store.get("products/prod-2"),
      variations: [{ id: "v-nova", attributes: { tamanho: "G" }, sku: "CAM-G2", price: null, stock: 9 }],
    });

    await expect(
      createOrder({
        customerId: "cliente-1",
        items: [{ productId: "prod-2", variationId: "v1", quantity: 1 }],
        paymentMethod: "pix",
      })
    ).rejects.toMatchObject({ code: "nao-encontrado" });

    // Nada foi baixado: estoque da variação restante intacto, nenhum pedido criado.
    expect(store.get("products/prod-2").variations[0].stock).toBe(9);
    expect(findOrderPath()).toBeUndefined();
  });

  it("edição cosmética preservando o id (renomear atributo) → compra conclui", async () => {
    // Mesmo id v1, atributos renomeados/reordenados (id estável — R-2).
    store.set("products/prod-2", {
      ...store.get("products/prod-2"),
      attributes: [{ name: "Tamanho", values: ["M"] }],
      variations: [{ id: "v1", attributes: { Tamanho: "M" }, sku: "CAM-M", price: null, stock: 2 }],
    });

    const result = await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-2", variationId: "v1", quantity: 1 }],
      paymentMethod: "pix",
    });

    expect(result.orderNumber).toBe(1);
    expect(store.get("products/prod-2").variations[0].stock).toBe(1);
  });
});

describe("getMyOrder — isolamento por cliente (SC-006)", () => {
  it("retorna o pedido para o próprio dono", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
    });
    const orderId = findOrderPath().split("/")[1];

    const order = await getMyOrder(orderId, "cliente-1");

    expect(order).not.toBeNull();
    expect(order.customerId).toBe("cliente-1");
  });

  it("retorna null quando o pedido é de outro cliente (não vaza por URL)", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
    });
    const orderId = findOrderPath().split("/")[1];

    expect(await getMyOrder(orderId, "outro-cliente")).toBeNull();
  });

  it("retorna null quando o pedido não existe", async () => {
    expect(await getMyOrder("inexistente", "cliente-1")).toBeNull();
  });
});

describe("retirada na loja (feature 016)", () => {
  it("pedido de retirada: frete 0, status 'retirada', endereço da loja congelado, sem endereço de entrega", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      shippingAddress: { cidade: "São Paulo" }, // ignorado na retirada
      paymentMethod: "pix",
      shipping: 1990, // ignorado na retirada
      deliveryMethod: "retirada",
      pickupAddress: "Rua da Loja, 10 — Centro",
    });

    const order = store.get(findOrderPath());
    expect(order.deliveryMethod).toBe("retirada");
    expect(order.shipping).toBe(0);
    expect(order.shippingStatus).toBe("retirada");
    expect(order.shippingMethod).toBe("Retirada na loja");
    expect(order.pickupAddress).toBe("Rua da Loja, 10 — Centro");
    expect(order.shippingAddress).toBeNull();
    expect(order.total).toBe(order.subtotal);
  });

  it("retirada com cupom percentual: desconto aplica, frete segue 0", async () => {
    store.set("coupons/OFF10", { code: "OFF10", type: "percentual", value: 10, active: true, usedCount: 0 });

    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      deliveryMethod: "retirada",
      pickupAddress: "Rua da Loja, 10",
      couponCode: "OFF10",
    });

    const order = store.get(findOrderPath());
    expect(order.discount).toBe(1999);
    expect(order.shipping).toBe(0);
    expect(order.total).toBe(order.subtotal - 1999);
  });

  it("pedido comum (entrega) não ganha campos de retirada", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      shipping: 1990,
    });

    const order = store.get(findOrderPath());
    expect(order.deliveryMethod).toBe("entrega");
    expect(order.pickupAddress).toBeNull();
    expect(order.shipping).toBe(1990);
  });

  it("fluxo de status: em_separacao → pronto_retirada → entregue", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      deliveryMethod: "retirada",
      pickupAddress: "Rua da Loja, 10",
    });
    const orderId = findOrderPath().split("/")[1];

    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "a", byName: "A" });
    await advanceStatus(orderId, ORDER_STATUS.EM_SEPARACAO, { byUid: "a", byName: "A" });
    await advanceStatus(orderId, ORDER_STATUS.PRONTO_RETIRADA, { byUid: "a", byName: "A" });

    expect(store.get(`orders/${orderId}`).status).toBe(ORDER_STATUS.PRONTO_RETIRADA);

    // De pronto_retirada não vai para "enviado" — só entregue.
    await expect(
      advanceStatus(orderId, ORDER_STATUS.ENVIADO, { byUid: "a", byName: "A" })
    ).rejects.toMatchObject({ code: "transicao-invalida" });

    await advanceStatus(orderId, ORDER_STATUS.ENTREGUE, { byUid: "a", byName: "A" });
    expect(store.get(`orders/${orderId}`).status).toBe(ORDER_STATUS.ENTREGUE);
  });
});

describe("cupom (feature 013)", () => {
  it("sem cupom: couponCode/couponType null e discount 0", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
    });

    const order = store.get(findOrderPath());
    expect(order.couponCode).toBeNull();
    expect(order.couponType).toBeNull();
    expect(order.discount).toBe(0);
  });

  it("recalcula o desconto pelo código e grava congelado (percentual)", async () => {
    store.set("coupons/OFF10", { code: "OFF10", type: "percentual", value: 10, active: true, usedCount: 0 });

    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      couponCode: "off10", // normaliza para OFF10
    });

    const order = store.get(findOrderPath());
    expect(order.couponCode).toBe("OFF10");
    expect(order.couponType).toBe("percentual");
    expect(order.discount).toBe(1999); // 10% de 19990, arredondado
    expect(order.total).toBe(19990 - 1999);
  });

  it("cupom de frete grátis zera o frete (status gratis, discount 0)", async () => {
    store.set("coupons/FRETE", { code: "FRETE", type: "frete_gratis", value: 0, active: true, usedCount: 0 });

    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      shipping: 1990,
      shippingEtaDays: 3,
      couponCode: "FRETE",
    });

    const order = store.get(findOrderPath());
    expect(order.shipping).toBe(0);
    expect(order.shippingStatus).toBe("gratis");
    expect(order.couponType).toBe("frete_gratis");
    expect(order.discount).toBe(0);
    expect(order.total).toBe(order.subtotal);
  });

  it("cupom inválido (inativo) aborta com cupom-invalido, sem efeitos", async () => {
    store.set("coupons/OFF", { code: "OFF", type: "fixo", value: 500, active: false, usedCount: 0 });

    await expect(
      createOrder({
        customerId: "cliente-1",
        items: [{ productId: "prod-1", quantity: 1 }],
        paymentMethod: "pix",
        couponCode: "OFF",
      })
    ).rejects.toMatchObject({ code: "cupom-invalido" });

    // Nada gravado: estoque intacto, sem pedido
    expect(store.get("products/prod-1").stock).toBe(1);
    expect(findOrderPath()).toBeUndefined();
  });

  it("cupom inexistente aborta com cupom-invalido", async () => {
    await expect(
      createOrder({
        customerId: "cliente-1",
        items: [{ productId: "prod-1", quantity: 1 }],
        paymentMethod: "pix",
        couponCode: "NAO-EXISTE",
      })
    ).rejects.toMatchObject({ code: "cupom-invalido" });
  });

  it("incrementa usedCount ao marcar como pago (conta no pago)", async () => {
    store.set("coupons/OFF10", { code: "OFF10", type: "percentual", value: 10, active: true, usedCount: 0 });
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      couponCode: "OFF10",
    });
    const orderId = findOrderPath().split("/")[1];

    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "a", byName: "A" });
    expect(store.get("coupons/OFF10").usedCount).toBe(1);

    // Avançar de novo NÃO re-incrementa (guard aggregatesApplied)
    await advanceStatus(orderId, ORDER_STATUS.EM_SEPARACAO, { byUid: "a", byName: "A" });
    expect(store.get("coupons/OFF10").usedCount).toBe(1);
  });

  it("pedido não pago (cancelado) NÃO consome o cupom", async () => {
    store.set("coupons/OFF10", { code: "OFF10", type: "percentual", value: 10, active: true, usedCount: 0 });
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      couponCode: "OFF10",
    });
    const orderId = findOrderPath().split("/")[1];

    await cancelOrder(orderId, { reason: "desistiu", byUid: "a", byName: "A" });
    expect(store.get("coupons/OFF10").usedCount).toBe(0);
  });

  it("cupom removido antes do pago → não quebra a transição", async () => {
    store.set("coupons/GONE", { code: "GONE", type: "fixo", value: 500, active: true, usedCount: 0 });
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      couponCode: "GONE",
    });
    const orderId = findOrderPath().split("/")[1];
    store.delete("coupons/GONE");

    await expect(
      advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "a", byName: "A" })
    ).resolves.toBeUndefined();
  });
});

describe("agregados de relatório ampliado (feature 018)", () => {
  beforeEach(() => {
    // prod-1 ganha categoria; cupom fixo p/ testar discountTotal.
    store.set("products/prod-1", {
      ...store.get("products/prod-1"),
      categoryId: "cat-1",
      categoryName: "Calçados",
    });
    store.set("coupons/OFF", { code: "OFF", type: "fixo", value: 1000, active: true, usedCount: 0 });
  });

  it("createOrder congela categoryId/categoryName no item", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
    });

    const order = store.get(findOrderPath());
    expect(order.items[0].categoryId).toBe("cat-1");
    expect(order.items[0].categoryName).toBe("Calçados");
  });

  it("pagar acumula discountTotal, byCategory, byPaymentMethod e byDeliveryMethod", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      couponCode: "OFF",
    });
    const orderId = findOrderPath().split("/")[1];

    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "a", byName: "A" });

    const statsPath = [...store.keys()].find((k) => k.startsWith("dailyStats/"));
    const stats = store.get(statsPath);

    expect(stats.discountTotal).toBe(1000);
    expect(stats.byCategory["cat-1"]).toEqual({ name: "Calçados", revenue: 19990, units: 1 });
    expect(stats.byPaymentMethod.pix).toBe(1);
    expect(stats.byDeliveryMethod.entrega).toBe(1); // sem retirada → entrega
  });

  it("cancelar um pedido pago reverte os novos agregados", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "pix",
      couponCode: "OFF",
    });
    const orderId = findOrderPath().split("/")[1];
    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "a", byName: "A" });

    await cancelOrder(orderId, { reason: "Estorno", byUid: "a", byName: "A" });

    const statsPath = [...store.keys()].find((k) => k.startsWith("dailyStats/"));
    const stats = store.get(statsPath);

    expect(stats.discountTotal).toBe(0);
    expect(stats.byCategory["cat-1"]).toBeUndefined(); // removido ao zerar
    expect(stats.byPaymentMethod.pix).toBeUndefined();
    expect(stats.byDeliveryMethod.entrega).toBeUndefined();
  });

  it("pedido de retirada conta em byDeliveryMethod.retirada", async () => {
    await createOrder({
      customerId: "cliente-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "boleto",
      deliveryMethod: "retirada",
      pickupAddress: "Rua da Loja, 10",
    });
    const orderId = findOrderPath().split("/")[1];
    await advanceStatus(orderId, ORDER_STATUS.PAGO, { byUid: "a", byName: "A" });

    const stats = store.get([...store.keys()].find((k) => k.startsWith("dailyStats/")));
    expect(stats.byDeliveryMethod.retirada).toBe(1);
    expect(stats.byPaymentMethod.boleto).toBe(1);
  });
});
