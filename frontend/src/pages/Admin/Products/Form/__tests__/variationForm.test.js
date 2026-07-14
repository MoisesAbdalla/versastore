import { describe, it, expect } from "vitest";
import {
  attributesFromProduct,
  variationsToForm,
  formVariationsToProduct,
  conflictsForRemoval,
  valueInUse,
  applyAttributeRemoval,
  normalizeAttributeValue,
  generateCombinations,
  remapAttributeName,
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

describe("normalizeAttributeValue", () => {
  it("siglas curtas e alfanuméricos em caixa alta", () => {
    expect(normalizeAttributeValue("g")).toBe("G");
    expect(normalizeAttributeValue("gg")).toBe("GG");
    expect(normalizeAttributeValue(" 110v ")).toBe("110V");
  });

  it("palavras em capitalizada", () => {
    expect(normalizeAttributeValue("preto")).toBe("Preto");
    expect(normalizeAttributeValue("AZUL")).toBe("Azul");
    expect(normalizeAttributeValue("verde  água")).toBe("Verde água");
  });

  it("vazio/espaços → string vazia", () => {
    expect(normalizeAttributeValue("   ")).toBe("");
  });
});

describe("generateCombinations (produto cartesiano)", () => {
  const attrs = [
    { name: "Tamanho", values: ["P", "M"] },
    { name: "Cor", values: ["Preta", "Azul", "Verde"] },
  ];

  it("gera 2×3 = 6 combinações a partir do zero", () => {
    const rows = generateCombinations(attrs, []);
    expect(rows).toHaveLength(6);
    expect(rows[0].values).toEqual({ Tamanho: "P", Cor: "Preta" });
    expect(rows[5].values).toEqual({ Tamanho: "M", Cor: "Verde" });
    expect(new Set(rows.map((r) => r.id)).size).toBe(6); // ids únicos
  });

  it("preserva as linhas existentes (id intacto) e só adiciona as que faltam", () => {
    const existing = [
      { id: "keep-1", values: { Tamanho: "P", Cor: "Preta" }, sku: "K1", priceText: "", stock: "5" },
    ];
    const rows = generateCombinations(attrs, existing);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toBe(existing[0]); // referência preservada, id estável
    expect(rows.filter((r) => r.id === "keep-1")).toHaveLength(1);
  });

  it("um único atributo gera uma linha por valor", () => {
    const rows = generateCombinations([{ name: "Voltagem", values: ["110V", "220V"] }], []);
    expect(rows.map((r) => r.values)).toEqual([{ Voltagem: "110V" }, { Voltagem: "220V" }]);
  });

  it("sem atributos com valores, devolve as linhas como estão", () => {
    const existing = [{ id: "x", values: {}, sku: "", priceText: "", stock: "" }];
    expect(generateCombinations([], existing)).toBe(existing);
  });
});

describe("remapAttributeName", () => {
  const rows = [
    { id: "a", values: { tamanho: "P", Cor: "Preta" }, sku: "", priceText: "", stock: "1" },
  ];

  it("move o valor para a nova chave ao renomear", () => {
    const next = remapAttributeName(rows, "tamanho", "Tamanho");
    expect(next[0].values).toEqual({ Tamanho: "P", Cor: "Preta" });
  });

  it("sem mudança quando o nome é igual (trim)", () => {
    expect(remapAttributeName(rows, "tamanho", " tamanho ")).toBe(rows);
  });
});
