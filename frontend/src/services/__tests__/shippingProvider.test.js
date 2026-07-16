import { describe, it, expect, vi, beforeEach } from "vitest";

const getShippingSettingsMock = vi.fn();

vi.mock("../settingsService", () => ({
  getShippingSettings: (...a) => getShippingSettingsMock(...a),
}));

import { quote } from "../shippingProvider";

const settings = {
  rules: [{ region: "Sudeste", cepRanges: [{ from: "01000000", to: "39999999" }], price: 1990, etaDays: 5 }],
  defaultRule: { price: 3990, etaDays: 10 },
  freeShippingThreshold: 19900,
};

beforeEach(() => getShippingSettingsMock.mockReset());

describe("shippingProvider.quote", () => {
  it("devolve uma opção com o frete da regra", async () => {
    getShippingSettingsMock.mockResolvedValue(settings);
    const r = await quote({ cep: "01001000", subtotal: 5000 });
    expect(r.ok).toBe(true);
    expect(r.options[0]).toMatchObject({ method: "Sudeste", price: 1990, etaDays: 5 });
  });

  it("frete grátis acima do limite", async () => {
    getShippingSettingsMock.mockResolvedValue(settings);
    const r = await quote({ cep: "01001000", subtotal: 20000 });
    expect(r.options[0]).toMatchObject({ price: 0, free: true });
  });

  it("propaga sem_regra/sem_config como erro", async () => {
    getShippingSettingsMock.mockResolvedValue({ rules: [], defaultRule: null, freeShippingThreshold: null });
    expect(await quote({ cep: "01001000", subtotal: 5000 })).toEqual({ ok: false, error: "sem_config" });
  });
});
