export const ORDER_STATUS = {
  AGUARDANDO_PAGAMENTO: "aguardando_pagamento",
  PAGO: "pago",
  EM_SEPARACAO: "em_separacao",
  ENVIADO: "enviado",
  // Retirada na loja (feature 016): ramo alternativo de "enviado" para pedidos
  // com deliveryMethod "retirada" — o admin marca quando o pedido está pronto.
  PRONTO_RETIRADA: "pronto_retirada",
  ENTREGUE: "entregue",
  CANCELADO: "cancelado",
  DEVOLVIDO: "devolvido",
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: "Aguardando pagamento",
  [ORDER_STATUS.PAGO]: "Pago",
  [ORDER_STATUS.EM_SEPARACAO]: "Em separação",
  [ORDER_STATUS.ENVIADO]: "Enviado",
  [ORDER_STATUS.PRONTO_RETIRADA]: "Pronto para retirada",
  [ORDER_STATUS.ENTREGUE]: "Entregue",
  [ORDER_STATUS.CANCELADO]: "Cancelado",
  [ORDER_STATUS.DEVOLVIDO]: "Devolvido",
};

export const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: [ORDER_STATUS.PAGO, ORDER_STATUS.CANCELADO],
  [ORDER_STATUS.PAGO]: [ORDER_STATUS.EM_SEPARACAO, ORDER_STATUS.CANCELADO],
  [ORDER_STATUS.EM_SEPARACAO]: [
    ORDER_STATUS.ENVIADO,
    ORDER_STATUS.PRONTO_RETIRADA,
    ORDER_STATUS.CANCELADO,
  ],
  [ORDER_STATUS.ENVIADO]: [ORDER_STATUS.ENTREGUE],
  [ORDER_STATUS.PRONTO_RETIRADA]: [ORDER_STATUS.ENTREGUE],
  [ORDER_STATUS.ENTREGUE]: [ORDER_STATUS.DEVOLVIDO],
  [ORDER_STATUS.CANCELADO]: [],
  [ORDER_STATUS.DEVOLVIDO]: [],
};

export function isValidTransition(from, to) {
  return (ORDER_STATUS_TRANSITIONS[from] || []).includes(to);
}

export function restocksInventory(status) {
  return status === ORDER_STATUS.CANCELADO || status === ORDER_STATUS.DEVOLVIDO;
}
