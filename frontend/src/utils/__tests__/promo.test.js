import { describe, it, expect } from "vitest";

import { isPromoActive, effectivePrice } from "../promo";

// Datas como Date; o service grava Timestamp, coberto pelo ramo toDate().
function ts(iso) {
  return new Date(iso);
}

describe("isPromoActive", () => {
  it("vigente dentro da janela", () => {
    const product = {
      price: 10000,
      promoPrice: 8000,
      promoStart: ts("2026-07-01T00:00:00-03:00"),
      promoEnd: ts("2026-07-31T23:59:59-03:00"),
    };

    expect(isPromoActive(product, new Date("2026-07-15T12:00:00-03:00"))).toBe(true);
  });

  it("não vigente antes do início (promoção futura)", () => {
    const product = {
      price: 10000,
      promoPrice: 8000,
      promoStart: ts("2026-08-01T00:00:00-03:00"),
      promoEnd: ts("2026-08-31T23:59:59-03:00"),
    };

    expect(isPromoActive(product, new Date("2026-07-15T12:00:00-03:00"))).toBe(false);
  });

  it("não vigente depois do fim (promoção expirada)", () => {
    const product = {
      price: 10000,
      promoPrice: 8000,
      promoStart: ts("2026-06-01T00:00:00-03:00"),
      promoEnd: ts("2026-06-30T23:59:59-03:00"),
    };

    expect(isPromoActive(product, new Date("2026-07-15T12:00:00-03:00"))).toBe(false);
  });

  it("sem datas = sempre vigente", () => {
    expect(isPromoActive({ price: 10000, promoPrice: 8000 }, new Date())).toBe(true);
  });

  it("promoPrice ausente ou >= price não é promoção", () => {
    expect(isPromoActive({ price: 10000, promoPrice: null })).toBe(false);
    expect(isPromoActive({ price: 10000, promoPrice: 10000 })).toBe(false);
    expect(isPromoActive({ price: 10000, promoPrice: 12000 })).toBe(false);
  });

  it("vigência avaliada no fuso de Brasília, não no do cliente (SC-003)", () => {
    // Promoção termina 25/07 (fim do dia em Brasília). Instante de teste:
    // 26/07 00:30 UTC = 25/07 21:30 em Brasília (ainda dia 25) → vigente.
    const product = {
      price: 10000,
      promoPrice: 8000,
      promoStart: ts("2026-07-01T00:00:00-03:00"),
      promoEnd: ts("2026-07-25T00:00:00-03:00"),
    };

    const instant = new Date("2026-07-26T00:30:00Z"); // 25/07 21:30 em São Paulo

    // O resultado NÃO depende do fuso da máquina de teste: a avaliação usa
    // Intl com timeZone fixo. Em Brasília ainda é dia 25 → vigente.
    expect(isPromoActive(product, instant)).toBe(true);

    // 12h depois (26/07 12:30 UTC = 26/07 09:30 em Brasília) → expirada.
    expect(isPromoActive(product, new Date("2026-07-26T12:30:00Z"))).toBe(false);
  });
});

describe("effectivePrice", () => {
  it("retorna promocional + % quando vigente", () => {
    const result = effectivePrice({ price: 10000, promoPrice: 8000 }, new Date());

    expect(result).toEqual({
      price: 8000,
      isPromo: true,
      originalPrice: 10000,
      discountPct: 20,
    });
  });

  it("retorna preço normal quando não há promoção", () => {
    const result = effectivePrice({ price: 10000, promoPrice: null }, new Date());

    expect(result).toMatchObject({ price: 10000, isPromo: false, discountPct: 0 });
  });
});
