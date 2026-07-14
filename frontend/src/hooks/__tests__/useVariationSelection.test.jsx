import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useVariationSelection } from "../useVariationSelection";

function v(id, values, stock) {
  return { id, attributes: values, stock };
}

const twoAxes = {
  id: "p1",
  stock: null,
  attributes: [
    { name: "Tamanho", values: ["P", "M", "G"] },
    { name: "Cor", values: ["Preta", "Azul"] },
  ],
  variations: [
    v("v1", { Tamanho: "P", Cor: "Preta" }, 2),
    v("v2", { Tamanho: "P", Cor: "Azul" }, 0), // esgotada
    v("v3", { Tamanho: "M", Cor: "Preta" }, 5),
    // G não existe em nenhuma cor
  ],
};

function options(result, attrName) {
  return result.current.optionsByAttribute.find((a) => a.name === attrName).options;
}

describe("useVariationSelection — 2 atributos", () => {
  it("sem seleção completa, não resolve variação nem permite comprar", () => {
    const { result } = renderHook(() => useVariationSelection(twoAxes));

    expect(result.current.resolvedVariation).toBeNull();
    expect(result.current.currentStock).toBeNull();
    expect(result.current.canBuy).toBe(false);

    act(() => result.current.select("Tamanho", "P"));
    expect(result.current.resolvedVariation).toBeNull();
    expect(result.current.canBuy).toBe(false);
  });

  it("filtra cruzado: escolher P desabilita Azul (esgotada) e mantém Preta", () => {
    const { result } = renderHook(() => useVariationSelection(twoAxes));

    act(() => result.current.select("Tamanho", "P"));

    const cores = options(result, "Cor");
    expect(cores.find((o) => o.value === "Preta").available).toBe(true);
    expect(cores.find((o) => o.value === "Azul").available).toBe(false);
  });

  it("valor sem nenhuma combinação (G) já nasce indisponível", () => {
    const { result } = renderHook(() => useVariationSelection(twoAxes));

    const tamanhos = options(result, "Tamanho");
    expect(tamanhos.find((o) => o.value === "G").available).toBe(false);
  });

  it("seleção completa resolve a variação, expõe estoque e habilita compra", () => {
    const { result } = renderHook(() => useVariationSelection(twoAxes));

    act(() => result.current.select("Cor", "Preta")); // ordem livre: cor primeiro
    act(() => result.current.select("Tamanho", "M"));

    expect(result.current.resolvedVariation?.id).toBe("v3");
    expect(result.current.currentStock).toBe(5);
    expect(result.current.canBuy).toBe(true);
  });

  it("combinação esgotada resolve mas não permite comprar", () => {
    const { result } = renderHook(() => useVariationSelection(twoAxes));

    act(() => result.current.select("Tamanho", "P"));
    act(() => result.current.select("Cor", "Azul"));

    expect(result.current.resolvedVariation?.id).toBe("v2");
    expect(result.current.currentStock).toBe(0);
    expect(result.current.canBuy).toBe(false);
  });

  it("clicar no valor selecionado desmarca (toggle)", () => {
    const { result } = renderHook(() => useVariationSelection(twoAxes));

    act(() => result.current.select("Tamanho", "P"));
    act(() => result.current.select("Tamanho", "P"));

    expect(result.current.selected.Tamanho).toBeNull();
  });
});

describe("useVariationSelection — 1 e 3 atributos", () => {
  it("1 atributo resolve na primeira escolha", () => {
    const product = {
      id: "p2",
      attributes: [{ name: "Voltagem", values: ["110V", "220V"] }],
      variations: [v("a", { Voltagem: "110V" }, 3), v("b", { Voltagem: "220V" }, 0)],
    };
    const { result } = renderHook(() => useVariationSelection(product));

    act(() => result.current.select("Voltagem", "110V"));

    expect(result.current.resolvedVariation?.id).toBe("a");
    expect(result.current.canBuy).toBe(true);
  });

  it("3 atributos em qualquer ordem; compra só com os três", () => {
    const product = {
      id: "p3",
      attributes: [
        { name: "Tamanho", values: ["P"] },
        { name: "Cor", values: ["Preta"] },
        { name: "Material", values: ["Algodão", "Poliéster"] },
      ],
      variations: [
        v("x", { Tamanho: "P", Cor: "Preta", Material: "Algodão" }, 4),
        v("y", { Tamanho: "P", Cor: "Preta", Material: "Poliéster" }, 0),
      ],
    };
    const { result } = renderHook(() => useVariationSelection(product));

    act(() => result.current.select("Material", "Algodão"));
    act(() => result.current.select("Cor", "Preta"));
    expect(result.current.canBuy).toBe(false); // falta Tamanho

    act(() => result.current.select("Tamanho", "P"));
    expect(result.current.resolvedVariation?.id).toBe("x");
    expect(result.current.canBuy).toBe(true);

    const materiais = options(result, "Material");
    expect(materiais.find((o) => o.value === "Poliéster").available).toBe(false); // esgotado
  });
});

describe("useVariationSelection — produto simples e legado", () => {
  it("produto simples compra direto pelo estoque geral", () => {
    const product = { id: "p4", stock: 7, variations: [] };
    const { result } = renderHook(() => useVariationSelection(product));

    expect(result.current.hasVariations).toBe(false);
    expect(result.current.attributes).toEqual([]);
    expect(result.current.currentStock).toBe(7);
    expect(result.current.canBuy).toBe(true);
  });

  it("produto legado consistente (sem attributes declarado) deriva os eixos", () => {
    const product = {
      id: "p5",
      variations: [
        v("a", { tamanho: "M" }, 2),
        v("b", { tamanho: "G" }, 1),
      ],
    };
    const { result } = renderHook(() => useVariationSelection(product));

    expect(result.current.attributes).toEqual([{ name: "tamanho", values: ["M", "G"] }]);

    act(() => result.current.select("tamanho", "M"));
    expect(result.current.resolvedVariation?.id).toBe("a");
  });
});
