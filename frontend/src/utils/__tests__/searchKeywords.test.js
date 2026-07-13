import { describe, it, expect } from "vitest";

import { buildSearchKeywords, normalizeQueryTerm } from "../searchKeywords";

describe("buildSearchKeywords", () => {
  it("gera prefixos ≥3 do nome (camis encontra Camiseta — SC-006)", () => {
    const keywords = buildSearchKeywords("Camiseta", "", "");

    expect(keywords).toContain("cam");
    expect(keywords).toContain("camis");
    expect(keywords).toContain("camiseta");
    expect(keywords).not.toContain("ca"); // < 3
  });

  it("normaliza acentos e caixa (SC-006)", () => {
    const keywords = buildSearchKeywords("Acessórios", "", "");

    expect(keywords).toContain("aces");
    expect(keywords).toContain("acessorios");
  });

  it("inclui o SKU normalizado inteiro para busca exata + prefixos dos tokens", () => {
    const keywords = buildSearchKeywords("Tênis", "NIKE-001", "");

    expect(keywords).toContain("nike-001"); // exato
    expect(keywords).toContain("nike"); // token
    expect(keywords).toContain("001"); // token (len 3)
  });

  it("inclui tokens do nome da categoria", () => {
    const keywords = buildSearchKeywords("Vestido", "", "Feminino");

    expect(keywords).toContain("fem");
    expect(keywords).toContain("feminino");
  });

  it("é idempotente e ordenado (base do backfill)", () => {
    const a = buildSearchKeywords("Camiseta Azul", "SKU-1", "Masculino");
    const b = buildSearchKeywords("Camiseta Azul", "SKU-1", "Masculino");

    expect(a).toEqual(b);
    expect(a).toEqual([...a].sort());
  });
});

describe("normalizeQueryTerm", () => {
  it("casa com um keyword gerado (simetria write/query)", () => {
    const keywords = buildSearchKeywords("Camiseta", "", "");

    expect(keywords).toContain(normalizeQueryTerm("CAMIS"));
    expect(normalizeQueryTerm("Camis")).toBe("camis");
  });

  it("toma a primeira palavra em consultas multi-termo", () => {
    expect(normalizeQueryTerm("camiseta azul")).toBe("camiseta");
  });

  it("vazio para termo vazio", () => {
    expect(normalizeQueryTerm("   ")).toBe("");
  });
});
