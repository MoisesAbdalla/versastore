import { describe, it, expect } from "vitest";

import { TERMS_VERSION, needsTermsReaccept } from "../terms";

describe("needsTermsReaccept", () => {
  it("perfil com a versão vigente não re-aceita", () => {
    expect(needsTermsReaccept({ termsVersion: TERMS_VERSION })).toBe(false);
  });

  it("perfil com versão antiga re-aceita", () => {
    expect(needsTermsReaccept({ termsVersion: "2026-07-13" })).toBe(true);
  });

  it("perfil sem registro de versão (legado) re-aceita", () => {
    expect(needsTermsReaccept({ termsVersion: null })).toBe(true);
    expect(needsTermsReaccept({})).toBe(true);
  });

  it("sem perfil (deslogado/carregando) não trava nada", () => {
    expect(needsTermsReaccept(null)).toBe(false);
    expect(needsTermsReaccept(undefined)).toBe(false);
  });
});
