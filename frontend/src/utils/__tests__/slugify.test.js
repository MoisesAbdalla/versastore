import { describe, it, expect } from "vitest";

import { slugify, normalizeForSearch } from "../slugify";

describe("slugify", () => {
  it("converte nome com acentos e espaços em slug", () => {
    expect(slugify("Calçados Femininos")).toBe("calcados-femininos");
    expect(slugify("Acessórios & Bolsas")).toBe("acessorios-bolsas");
  });

  it("remove hifens nas pontas", () => {
    expect(slugify("  Promoção!  ")).toBe("promocao");
  });

  it("retorna vazio para entrada vazia", () => {
    expect(slugify("")).toBe("");
    expect(slugify(null)).toBe("");
  });
});

describe("normalizeForSearch", () => {
  it("remove acentos e caixa alta preservando espaços internos", () => {
    expect(normalizeForSearch("Tênis Nike Air Max")).toBe("tenis nike air max");
  });

  it("retorna vazio para entrada vazia", () => {
    expect(normalizeForSearch(null)).toBe("");
  });
});
