// Regras de cupom (feature 013) — funções puras, reutilizadas pelo checkout,
// pelo admin e pelo orderService (fonte única de verdade do desconto).
// Dinheiro em centavos; percentual como número 1–100.
import { COUPON_TYPE } from "../constants/coupon";

// Normaliza o código: sem espaços nas bordas, maiúsculas. Torna a busca por
// documento (id = código) e o match case-insensitive (FR-013).
export function normalizeCode(raw) {
  return String(raw || "").trim().toUpperCase();
}

// Aceita Timestamp do Firestore (toMillis/toDate), Date ou number (ms).
function toMillis(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return null;
}

// Status derivado para o badge do admin (não é persistido).
export function couponStatus(coupon, now = Date.now()) {
  if (!coupon.active) {
    return "inativo";
  }

  const start = toMillis(coupon.startAt);
  const end = toMillis(coupon.endAt);

  if (start != null && now < start) {
    return "inativo";
  }
  if (end != null && now > end) {
    return "expirado";
  }
  if (coupon.maxUses != null && (coupon.usedCount || 0) >= coupon.maxUses) {
    return "esgotado";
  }
  return "ativo";
}

// Decisão de aplicação/revalidação. Usada no apply (checkout) e no createOrder.
export function isCouponValid(coupon, { subtotal, now = Date.now() }) {
  if (!coupon || !coupon.active) {
    return { ok: false, error: "inativo" };
  }

  const start = toMillis(coupon.startAt);
  const end = toMillis(coupon.endAt);

  if ((start != null && now < start) || (end != null && now > end)) {
    return { ok: false, error: "expirado" };
  }
  if (coupon.maxUses != null && (coupon.usedCount || 0) >= coupon.maxUses) {
    return { ok: false, error: "esgotado" };
  }
  if (coupon.minSubtotal != null && subtotal < coupon.minSubtotal) {
    return { ok: false, error: "minimo" };
  }
  return { ok: true };
}

// Efeito do cupom no total. discount incide sobre o subtotal (fixo/percentual);
// frete grátis zera o frete. total nunca fica negativo (discount ≤ subtotal).
export function computeCouponEffect(coupon, { subtotal, shipping = 0 }) {
  const ship = shipping || 0;

  if (coupon.type === COUPON_TYPE.FRETE_GRATIS) {
    return { discount: 0, freeShipping: true, effectiveShipping: 0, total: subtotal };
  }

  let discount = 0;
  if (coupon.type === COUPON_TYPE.PERCENTUAL) {
    discount = Math.round((subtotal * (coupon.value || 0)) / 100);
  } else if (coupon.type === COUPON_TYPE.FIXO) {
    discount = coupon.value || 0;
  }

  discount = Math.min(Math.max(discount, 0), subtotal); // teto no subtotal
  return { discount, freeShipping: false, effectiveShipping: ship, total: subtotal - discount + ship };
}

// Validação do formulário do admin. Recebe valores já convertidos (value em
// centavos p/ fixo, número p/ percentual; datas como Date|null). A unicidade do
// código é checada no service (precisa ler o Firestore).
export function validateCouponInput({ code, type, value, startAt, endAt, maxUses }) {
  const errors = {};

  if (!code || !code.trim()) {
    errors.code = "Informe o código.";
  }

  if (type !== COUPON_TYPE.FRETE_GRATIS) {
    if (value == null || value <= 0) {
      errors.value = "Informe um valor maior que zero.";
    } else if (type === COUPON_TYPE.PERCENTUAL && value > 100) {
      errors.percent = "O percentual deve ser no máximo 100.";
    }
  }

  const start = toMillis(startAt);
  const end = toMillis(endAt);
  if (start != null && end != null && end < start) {
    errors.dates = "A data final deve ser igual ou depois da inicial.";
  }

  if (maxUses != null && maxUses < 0) {
    errors.maxUses = "O limite não pode ser negativo.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
