import { describe, it, expect } from "vitest";
import {
  validateVariations,
  deriveAttributesFromVariations,
  detectMergeConflicts,
} from "../variationValidation";

const attrs = [
  { name: "Tamanho", values: ["P", "M", "G", "GG"] },
  { name: "Cor", values: ["preta", "azul"] },
];

function v(id, tamanho, cor, stock = 1) {
  return { id, attributes: { Tamanho: tamanho, Cor: cor }, stock };
}

describe("validateVariations", () => {
  it("aceita produto simples (sem atributos nem variações)", () => {
    expect(validateVariations({ attributes: [], variations: [] })).toEqual({ ok: true, issues: [] });
  });

  it("aceita um conjunto consistente", () => {
    const product = { attributes: attrs, variations: [v("a", "P", "preta"), v("b", "P", "azul")] };
    expect(validateVariations(product)).toEqual({ ok: true, issues: [] });
  });

  it("bloqueia variação com atributo sem valor", () => {
    const product = { attributes: attrs, variations: [v("a", "P", "preta"), v("b", "M", "")] };
    const r = validateVariations(product);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/sem valor de "Cor"/);
  });

  it("bloqueia combinação duplicada", () => {
    const product = { attributes: attrs, variations: [v("a", "P", "preta"), v("b", "P", "preta")] };
    const r = validateVariations(product);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/duplicada/);
  });

  it("bloqueia valor fora da lista permitida", () => {
    const product = { attributes: attrs, variations: [v("a", "XG", "preta")] };
    const r = validateVariations(product);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/não é um valor válido de "Tamanho"/);
  });

  it("bloqueia atributo declarado sem valores", () => {
    const product = {
      attributes: [{ name: "Tamanho", values: [] }],
      variations: [{ id: "a", attributes: { Tamanho: "P" }, stock: 1 }],
    };
    const r = validateVariations(product);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/não tem valores/);
  });

  it("bloqueia variações sem atributos declarados (legado)", () => {
    const product = { attributes: [], variations: [{ id: "a", attributes: { Tamanho: "P" }, stock: 1 }] };
    const r = validateVariations(product);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/não têm atributos declarados/);
  });
});

describe("deriveAttributesFromVariations", () => {
  it("deriva atributos e valores na ordem de primeira aparição", () => {
    const variations = [v("a", "P", "preta"), v("b", "M", "azul"), v("c", "G", "preta")];
    const r = deriveAttributesFromVariations(variations);
    expect(r.inconsistent).toBe(false);
    expect(r.attributes).toEqual([
      { name: "Tamanho", values: ["P", "M", "G"] },
      { name: "Cor", values: ["preta", "azul"] },
    ]);
  });

  it("é idempotente na forma: rodar sobre variações consistentes dá o mesmo resultado", () => {
    const variations = [v("a", "P", "preta"), v("b", "M", "azul")];
    expect(deriveAttributesFromVariations(variations)).toEqual(deriveAttributesFromVariations(variations));
  });

  it("marca inconsistente quando uma variação não tem uma das chaves", () => {
    const variations = [
      { id: "a", attributes: { Tamanho: "P", Cor: "preta" }, stock: 1 },
      { id: "b", attributes: { Cor: "azul" }, stock: 1 }, // sem Tamanho
    ];
    const r = deriveAttributesFromVariations(variations);
    expect(r.inconsistent).toBe(true);
    expect(r.issues.join(" ")).toMatch(/Tamanho/);
    // Não inventa: a interseção fica só com Cor.
    expect(r.attributes.map((a) => a.name)).toEqual(["Cor"]);
  });

  it("produto sem variações → atributos vazios, consistente", () => {
    expect(deriveAttributesFromVariations([])).toEqual({ attributes: [], inconsistent: false, issues: [] });
  });
});

describe("detectMergeConflicts", () => {
  it("detecta colapso ao remover um atributo", () => {
    // Remover "Cor" → só "Tamanho": P/preta e P/azul viram ambos "P".
    const prev = [v("a", "P", "preta", 3), v("b", "P", "azul", 5), v("c", "M", "preta", 2)];
    const conflicts = detectMergeConflicts(prev, ["Tamanho"]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].combination).toBe("P");
    expect(conflicts[0].variationIds.sort()).toEqual(["a", "b"]);
  });

  it("sem conflito quando as combinações continuam únicas", () => {
    const prev = [v("a", "P", "preta"), v("b", "M", "azul")];
    expect(detectMergeConflicts(prev, ["Tamanho", "Cor"])).toEqual([]);
  });
});
