import { describe, it, expect } from "vitest";

import {
  normalizeCode,
  couponStatus,
  isCouponValid,
  computeCouponEffect,
  validateCouponInput,
} from "../coupon";
import { COUPON_TYPE } from "../../constants/coupon";

const HOUR = 3600 * 1000;
const NOW = 1_700_000_000_000;

function coupon(overrides = {}) {
  return { code: "X", type: COUPON_TYPE.PERCENTUAL, value: 10, active: true, usedCount: 0, ...overrides };
}

describe("normalizeCode", () => {
  it("apara espaços e força maiúsculas", () => {
    expect(normalizeCode("  bemvindo10 ")).toBe("BEMVINDO10");
    expect(normalizeCode(null)).toBe("");
  });
});

describe("couponStatus", () => {
  it("inativo quando active=false", () => {
    expect(couponStatus(coupon({ active: false }), NOW)).toBe("inativo");
  });

  it("inativo antes do início da validade", () => {
    expect(couponStatus(coupon({ startAt: NOW + HOUR }), NOW)).toBe("inativo");
  });

  it("expirado após o fim da validade", () => {
    expect(couponStatus(coupon({ endAt: NOW - HOUR }), NOW)).toBe("expirado");
  });

  it("esgotado quando usedCount atinge maxUses", () => {
    expect(couponStatus(coupon({ maxUses: 2, usedCount: 2 }), NOW)).toBe("esgotado");
  });

  it("ativo no caso feliz", () => {
    expect(couponStatus(coupon({ startAt: NOW - HOUR, endAt: NOW + HOUR, maxUses: 5, usedCount: 1 }), NOW)).toBe("ativo");
  });
});

describe("isCouponValid", () => {
  it("recusa inativo", () => {
    expect(isCouponValid(coupon({ active: false }), { subtotal: 10000, now: NOW })).toEqual({ ok: false, error: "inativo" });
  });

  it("recusa fora da validade (antes e depois)", () => {
    expect(isCouponValid(coupon({ startAt: NOW + HOUR }), { subtotal: 10000, now: NOW }).error).toBe("expirado");
    expect(isCouponValid(coupon({ endAt: NOW - HOUR }), { subtotal: 10000, now: NOW }).error).toBe("expirado");
  });

  it("recusa esgotado", () => {
    expect(isCouponValid(coupon({ maxUses: 1, usedCount: 1 }), { subtotal: 10000, now: NOW }).error).toBe("esgotado");
  });

  it("recusa subtotal abaixo do mínimo", () => {
    expect(isCouponValid(coupon({ minSubtotal: 10000 }), { subtotal: 8000, now: NOW }).error).toBe("minimo");
  });

  it("aceita cupom válido", () => {
    expect(isCouponValid(coupon({ minSubtotal: 5000 }), { subtotal: 8000, now: NOW })).toEqual({ ok: true });
  });
});

describe("computeCouponEffect", () => {
  it("percentual desconta sobre o subtotal (arredondado)", () => {
    const r = computeCouponEffect(coupon({ type: COUPON_TYPE.PERCENTUAL, value: 10 }), { subtotal: 19990, shipping: 1990 });
    expect(r.discount).toBe(1999);
    expect(r.freeShipping).toBe(false);
    expect(r.total).toBe(19990 - 1999 + 1990);
  });

  it("valor fixo desconta o valor, com teto no subtotal (total nunca negativo)", () => {
    const r = computeCouponEffect(coupon({ type: COUPON_TYPE.FIXO, value: 2000 }), { subtotal: 5000, shipping: 0 });
    expect(r.discount).toBe(2000);
    expect(r.total).toBe(3000);

    const capped = computeCouponEffect(coupon({ type: COUPON_TYPE.FIXO, value: 9000 }), { subtotal: 5000, shipping: 990 });
    expect(capped.discount).toBe(5000); // limitado ao subtotal
    expect(capped.total).toBe(990); // 5000 - 5000 + 990
  });

  it("frete grátis zera o frete e não mexe no subtotal", () => {
    const r = computeCouponEffect(coupon({ type: COUPON_TYPE.FRETE_GRATIS }), { subtotal: 8000, shipping: 1990 });
    expect(r.freeShipping).toBe(true);
    expect(r.effectiveShipping).toBe(0);
    expect(r.discount).toBe(0);
    expect(r.total).toBe(8000);
  });
});

describe("validateCouponInput", () => {
  it("exige código", () => {
    expect(validateCouponInput({ code: "  ", type: COUPON_TYPE.FIXO, value: 1000 }).errors.code).toBeTruthy();
  });

  it("exige valor > 0 para fixo/percentual", () => {
    expect(validateCouponInput({ code: "X", type: COUPON_TYPE.FIXO, value: 0 }).errors.value).toBeTruthy();
    expect(validateCouponInput({ code: "X", type: COUPON_TYPE.PERCENTUAL, value: null }).errors.value).toBeTruthy();
  });

  it("percentual no máximo 100", () => {
    expect(validateCouponInput({ code: "X", type: COUPON_TYPE.PERCENTUAL, value: 150 }).errors.percent).toBeTruthy();
  });

  it("frete grátis dispensa valor", () => {
    expect(validateCouponInput({ code: "X", type: COUPON_TYPE.FRETE_GRATIS, value: null }).ok).toBe(true);
  });

  it("data final não pode ser antes da inicial", () => {
    const start = new Date(2026, 6, 10);
    const end = new Date(2026, 6, 1);
    expect(validateCouponInput({ code: "X", type: COUPON_TYPE.FIXO, value: 1000, startAt: start, endAt: end }).errors.dates).toBeTruthy();
  });

  it("limite de uso não pode ser negativo", () => {
    expect(validateCouponInput({ code: "X", type: COUPON_TYPE.FIXO, value: 1000, maxUses: -1 }).errors.maxUses).toBeTruthy();
  });

  it("caso válido não tem erros", () => {
    expect(validateCouponInput({ code: "BEMVINDO10", type: COUPON_TYPE.PERCENTUAL, value: 10, maxUses: 100 }).ok).toBe(true);
  });
});
