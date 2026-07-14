import { describe, it, expect } from "vitest";
import {
  attributesFromProduct,
  variationsToForm,
  formVariationsToProduct,
  conflictsForRemoval,
  valueInUse,
  applyAttributeRemoval,
} from "../variationForm";

describe("attributesFromProduct", () => {
  it("usa product.attributes quando presente", () => {
    const product = { attributes: [{ name: "Tamanho", values: ["P", "M"] }], variations: [] };
    expect(attributesFromProduct(product)).toEqual([{ name: "Tamanho", values: ["P", "M"] }]);
  });

  it("deriva de variações legadas quando não há attributes declarado", () => {
    const product = {
      variations: [
        { id: "a", attributes: { tamanho: "P", cor: "preta" } },
        { id: "b", attributes: { tamanho: "M", cor: "azul" } },
      ],
    };
    expect(attributesFromProduct(product)).toEqual([
      { name: "tamanho", values: ["P", "M"] },
      { name: "cor", values: ["preta", "azul"] },
    ]);
  });
});

describe("round-trip form ↔ produto preserva o id (R-2)", () => {
  it("variationsToForm → formVariationsToProduct mantém os ids", () => {
    const variations = [
      { id: "keep-1", attributes: { Tamanho: "P", Cor: "preta" }, sku: "K1", price: 5000, stock: 3 },
      { id: "keep-2", attributes: { Tamanho: "M", Cor: "azul" }, sku: "K2", price: null, stock: 4 },
    ];
    const rows = variationsToForm(variations);
    const back = formVariationsToProduct(rows, ["Tamanho", "Cor"]);

    expect(back.map((v) => v.id)).toEqual(["keep-1", "keep-2"]);
    expect(back[0].attributes).toEqual({ Tamanho: "P", Cor: "preta" });
    expect(back[0].stock).toBe(3);
  });

  it("chaveia os valores exatamente pelos atributos declarados (ordem/nome)", () => {
    const rows = [{ id: "v1", values: { Tamanho: "P", Cor: "preta", Extra: "x" }, sku: "", priceText: "", stock: "2" }];
    const back = formVariationsToProduct(rows, ["Tamanho", "Cor"]);
    expect(back[0].attributes).toEqual({ Tamanho: "P", Cor: "preta" }); // "Extra" descartado
  });
});

describe("conflictsForRemoval + applyAttributeRemoval (FR-008a)", () => {
  const rows = [
    { id: "a", values: { Tamanho: "P", Cor: "preta" }, sku: "", priceText: "", stock: "3" },
    { id: "b", values: { Tamanho: "P", Cor: "azul" }, sku: "", priceText: "", stock: "5" },
    { id: "c", values: { Tamanho: "M", Cor: "preta" }, sku: "", priceText: "", stock: "2" },
  ];

  it("detecta o grupo em conflito ao remover 'Cor'", () => {
    const conflicts = conflictsForRemoval(rows, ["Tamanho"]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].variationIds.sort()).toEqual(["a", "b"]);
  });

  it("resolução 'keep' mantém a variação escolhida e descarta as outras", () => {
    const next = applyAttributeRemoval(rows, "Cor", ["Tamanho"], { P: { mode: "keep", keepId: "b" } });
    const ids = next.map((v) => v.id).sort();
    expect(ids).toEqual(["b", "c"]); // "a" descartada
    expect(next.find((v) => v.id === "b").values).toEqual({ Tamanho: "P" });
  });

  it("resolução 'sum' soma os estoques do grupo no sobrevivente", () => {
    const next = applyAttributeRemoval(rows, "Cor", ["Tamanho"], { P: { mode: "sum", keepId: "a" } });
    const survivorP = next.find((v) => v.values.Tamanho === "P");
    expect(survivorP.stock).toBe("8"); // 3 + 5
    expect(next).toHaveLength(2);
  });

  it("sem conflito, apenas remove a chave do atributo", () => {
    const single = [{ id: "x", values: { Tamanho: "P", Cor: "preta" }, sku: "", priceText: "", stock: "1" }];
    const next = applyAttributeRemoval(single, "Cor", ["Tamanho"]);
    expect(next).toEqual([{ id: "x", values: { Tamanho: "P" }, sku: "", priceText: "", stock: "1" }]);
  });
});

describe("valueInUse", () => {
  const rows = [{ id: "a", values: { Tamanho: "GG" }, sku: "", priceText: "", stock: "1" }];
  it("true quando alguma variação usa o valor", () => {
    expect(valueInUse(rows, "Tamanho", "GG")).toBe(true);
  });
  it("false quando nenhuma variação usa", () => {
    expect(valueInUse(rows, "Tamanho", "P")).toBe(false);
  });
});
