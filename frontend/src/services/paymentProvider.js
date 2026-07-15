// Interface de provedor de pagamento (feature 009 / M4a). Ponto de integração
// ESTÁVEL para o M4b plugar o Mercado Pago sem reescrever o checkout: o checkout
// só conhece `createPayment(order)`, nunca o gateway.
//
// Na M4a é um STUB: nenhum processamento/cobrança — apenas registra "pendente".
// No M4b, esta implementação será substituída por uma que gera a cobrança real
// via Cloud Function (retornando os dados de pagamento — QR/checkout URL/etc.).
export async function createPayment(order) {
  return {
    status: "pendente",
    provider: "stub",
    providerRef: null,
    orderId: order?.id ?? null,
  };
}
