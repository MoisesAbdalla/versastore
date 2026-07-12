import { collection, getDocs, query, where, limit } from "firebase/firestore";

import db from "../firebase/firestore";
import { createOrder, advanceStatus } from "../services/orderService";
import { ORDER_STATUS } from "../constants/orderStatus";
import { PRODUCT_STATUS } from "../constants/product";

const SAMPLE_ADDRESS = {
  rua: "Rua das Flores",
  numero: "123",
  complemento: "",
  bairro: "Centro",
  cidade: "São Paulo",
  uf: "SP",
  cep: "01000-000",
};

const PAYMENT_METHODS = ["pix", "cartao", "boleto"];

// Cadeias de avanço para espalhar pedidos pelos status do ciclo de vida.
const STATUS_CHAINS = [
  [],
  [ORDER_STATUS.PAGO],
  [ORDER_STATUS.PAGO, ORDER_STATUS.EM_SEPARACAO],
  [ORDER_STATUS.PAGO, ORDER_STATUS.EM_SEPARACAO, ORDER_STATUS.ENVIADO],
  [ORDER_STATUS.PAGO, ORDER_STATUS.EM_SEPARACAO, ORDER_STATUS.ENVIADO, ORDER_STATUS.ENTREGUE],
];

// Seed de desenvolvimento (tasks.md T038) — insumo do quickstart §4-7.
// Executar no console do navegador, logado como ADMIN, com produtos ativos
// e ao menos um usuário customer na base:
//   await seedOrders({ count: 8 })
// Usa o orderService real: baixa estoque de verdade e alimenta dailyStats.
export async function seedOrders({ count = 8 } = {}) {
  const [customersSnap, productsSnap] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "==", "customer"), limit(10))),
    getDocs(
      query(
        collection(db, "products"),
        where("deleted", "==", false),
        where("status", "==", PRODUCT_STATUS.ATIVO),
        limit(10)
      )
    ),
  ]);

  const customers = customersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (!customers.length) {
    throw new Error("Seed: cadastre ao menos um usuário customer pela loja antes.");
  }

  if (!products.length) {
    throw new Error("Seed: publique ao menos um produto ativo com estoque antes.");
  }

  const created = [];

  for (let i = 0; i < count; i++) {
    const customer = customers[i % customers.length];
    const product = products[i % products.length];
    const quantity = 1 + (i % 2);

    if ((product.totalStock || 0) < quantity) {
      console.warn(`Seed: pulando "${product.name}" (estoque insuficiente).`);
      continue;
    }

    const item = { productId: product.id, quantity };

    if ((product.variations || []).length) {
      const variation = product.variations.find((v) => v.stock >= quantity);

      if (!variation) {
        console.warn(`Seed: pulando "${product.name}" (variações sem estoque).`);
        continue;
      }

      item.variationId = variation.id;
    }

    const { id, orderNumber } = await createOrder({
      customerId: customer.id,
      items: [item],
      shippingAddress: SAMPLE_ADDRESS,
      paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
    });

    for (const status of STATUS_CHAINS[i % STATUS_CHAINS.length]) {
      await advanceStatus(id, status, { byUid: "seed", byName: "Seed (dev)" });
    }

    product.totalStock -= quantity;
    created.push(orderNumber);
  }

  console.log(`Seed concluído: ${created.length} pedido(s) criado(s):`, created);

  return created;
}
