import { describe, it, expect } from "vitest";
import { cepToNumber, matchRule, computeShipping, validateShippingSettings } from "../shipping";

const settings = {
  rules: [
    { region: "Sudeste", cepRanges: [{ from: "01000000", to: "39999999" }], price: 1990, etaDays: 5 },
    { region: "Sul", cepRanges: [{ from: "80000000", to: "99999999" }], price: 2990, etaDays: 7 },
  ],
  defaultRule: { price: 3990, etaDays: 10 },
  freeShippingThreshold: 19900,
};

describe("cepToNumber", () => {
  it("extrai os dígitos", () => {
    expect(cepToNumber("01001-000")).toBe(1001000);
  });
});

describe("matchRule", () => {
  it("casa a região pela faixa de CEP", () => {
    expect(matchRule(settings, { cep: "01001-000", subtotal: 5000 }).region).toBe("Sudeste");
    expect(matchRule(settings, { cep: "80010-000", subtotal: 5000 }).region).toBe("Sul");
  });

  it("null quando nenhuma faixa cobre", () => {
    expect(matchRule(settings, { cep: "50000-000", subtotal: 5000 })).toBe(null);
  });

  it("respeita a faixa de valor da regra", () => {
    const s = { rules: [{ region: "X", cepRanges: [{ from: "01000000", to: "09999999" }], price: 100, etaDays: 1, minSubtotal: 10000 }] };
    expect(matchRule(s, { cep: "01001000", subtotal: 5000 })).toBe(null);
    expect(matchRule(s, { cep: "01001000", subtotal: 15000 }).region).toBe("X");
  });
});

describe("computeShipping", () => {
  it("frete grátis prevalece acima do limite", () => {
    const r = computeShipping(settings, { cep: "01001000", subtotal: 20000 });
    expect(r).toMatchObject({ price: 0, free: true, method: "Frete grátis" });
  });

  it("usa a regra da região quando abaixo do limite", () => {
    const r = computeShipping(settings, { cep: "01001000", subtotal: 5000 });
    expect(r).toMatchObject({ price: 1990, etaDays: 5, method: "Sudeste", free: false });
  });

  it("cai no frete padrão quando sem regra específica", () => {
    const r = computeShipping(settings, { cep: "50000000", subtotal: 5000 });
    expect(r).toMatchObject({ price: 3990, method: "Demais regiões" });
  });

  it("sem_regra quando não há regra nem padrão", () => {
    const s = { rules: settings.rules, defaultRule: null, freeShippingThreshold: null };
    expect(computeShipping(s, { cep: "50000000", subtotal: 5000 })).toEqual({ error: "sem_regra" });
  });

  it("sem_config quando a tabela está totalmente vazia", () => {
    expect(computeShipping({ rules: [], defaultRule: null, freeShippingThreshold: null }, { cep: "01001000", subtotal: 5000 })).toEqual({ error: "sem_config" });
    expect(computeShipping(null, { cep: "01001000", subtotal: 5000 })).toEqual({ error: "sem_config" });
  });
});

describe("validateShippingSettings", () => {
  it("aceita uma tabela válida", () => {
    expect(validateShippingSettings(settings)).toEqual({ ok: true, issues: [] });
  });

  it("bloqueia faixa malformada e sobreposta", () => {
    const bad = {
      rules: [
        { region: "A", cepRanges: [{ from: "01000000", to: "05000000" }], price: 100, etaDays: 1 },
        { region: "B", cepRanges: [{ from: "04000000", to: "09000000" }], price: 100, etaDays: 1 }, // sobrepõe A
        { region: "C", cepRanges: [{ from: "123", to: "456" }], price: 100, etaDays: 1 }, // 8 dígitos?
      ],
    };
    const r = validateShippingSettings(bad);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/sobrep/);
    expect(r.issues.join(" ")).toMatch(/8 dígitos/);
  });

  it("bloqueia valor/prazo/região vazios", () => {
    const bad = { rules: [{ region: "", cepRanges: [{ from: "01000000", to: "02000000" }], price: null, etaDays: null }] };
    const r = validateShippingSettings(bad);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/região/);
    expect(r.issues.join(" ")).toMatch(/valor/);
    expect(r.issues.join(" ")).toMatch(/prazo/);
  });
});
