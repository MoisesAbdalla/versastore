// Vigência de promoção da vitrine (feature 005). A janela é avaliada SEMPRE no
// fuso America/Sao_Paulo — nunca no fuso do dispositivo do cliente — para que
// uma promoção que "termina dia 25" expire no mesmo instante para todos
// (clarificação 2026-07-12). Regra: promoção vigente se promoPrice < price E,
// havendo datas, o dia corrente (em Brasília) está dentro de promoStart..promoEnd.
// Sem datas, sempre vigente.

const SAO_PAULO_TZ = "America/Sao_Paulo";

// Chave de dia (yyyy-mm-dd) de um instante no fuso de Brasília — comparável
// lexicograficamente (mesmo padrão de dayKey da feature 003).
function dayKeyInSaoPaulo(value) {
  if (value == null) {
    return null;
  }

  const date = value.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isPromoActive(product, now = new Date()) {
  if (!product) {
    return false;
  }

  const { price, promoPrice, promoStart, promoEnd } = product;

  if (promoPrice == null || price == null || promoPrice >= price) {
    return false;
  }

  const today = dayKeyInSaoPaulo(now);
  const start = dayKeyInSaoPaulo(promoStart);
  const end = dayKeyInSaoPaulo(promoEnd);

  // Sem datas = sempre vigente.
  if (start && today < start) {
    return false;
  }

  if (end && today > end) {
    return false;
  }

  return true;
}

// Preço efetivo de exibição: promocional se vigente, senão o normal.
export function effectivePrice(product, now = new Date()) {
  const price = product?.price ?? 0;

  if (isPromoActive(product, now)) {
    const discountPct = Math.round(((price - product.promoPrice) / price) * 100);

    return { price: product.promoPrice, isPromo: true, originalPrice: price, discountPct };
  }

  return { price, isPromo: false, originalPrice: price, discountPct: 0 };
}
