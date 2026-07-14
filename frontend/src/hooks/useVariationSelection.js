import { useCallback, useMemo, useState } from "react";

import { deriveAttributesFromVariations } from "../utils/variationValidation";

// Seleção de variação POR ATRIBUTO (feature 008, US2). Uma escolha por
// atributo, em ordem livre; a disponibilidade de cada valor considera a
// seleção atual dos DEMAIS atributos; estoque/compra só reagem quando todos
// os atributos estão selecionados (variação resolvida). Genérico para 1, 2 ou
// 3+ atributos. Produto simples (sem variações) compra pelo estoque geral.
export function useVariationSelection(product) {
  const variations = useMemo(() => product?.variations || [], [product]);

  // Atributos declarados no produto (modelo 008) ou derivados das variações
  // (produto legado consistente, ainda não migrado pelo backfill).
  const attributes = useMemo(() => {
    if (Array.isArray(product?.attributes) && product.attributes.length) {
      return product.attributes;
    }

    return deriveAttributesFromVariations(variations).attributes;
  }, [product, variations]);

  const [selected, setSelected] = useState({});

  const names = useMemo(() => attributes.map((attr) => attr.name), [attributes]);
  const hasVariations = variations.length > 0;

  // Variação casa com uma seleção parcial? (só compara os atributos escolhidos)
  const matches = useCallback((variation, partial) => {
    return Object.entries(partial).every(
      ([name, value]) => value == null || variation.attributes?.[name] === value
    );
  }, []);

  // Alternar seleção: clicar no valor já escolhido desmarca.
  const select = useCallback((name, value) => {
    setSelected((current) => ({
      ...current,
      [name]: current[name] === value ? null : value,
    }));
  }, []);

  // Por atributo, os valores na ORDEM DECLARADA (FR-002a), cada um com
  // `available`: existe variação com estoque casando com a seleção dos DEMAIS
  // atributos ∪ este valor (FR-010).
  const optionsByAttribute = useMemo(() => {
    return attributes.map((attr) => ({
      name: attr.name,
      options: (attr.values || []).map((value) => {
        const others = { ...selected, [attr.name]: value };
        const available = variations.some(
          (variation) => (variation.stock ?? 0) > 0 && matches(variation, others)
        );

        return { value, available };
      }),
    }));
  }, [attributes, variations, selected, matches]);

  // Variação única quando TODOS os atributos estão selecionados (FR-012).
  const resolvedVariation = useMemo(() => {
    if (!hasVariations || names.length === 0) {
      return null;
    }

    if (!names.every((name) => selected[name] != null)) {
      return null;
    }

    return (
      variations.find((variation) =>
        names.every((name) => variation.attributes?.[name] === selected[name])
      ) || null
    );
  }, [hasVariations, names, selected, variations]);

  const currentStock = hasVariations
    ? resolvedVariation
      ? resolvedVariation.stock ?? 0
      : null
    : product?.stock ?? product?.totalStock ?? 0;

  const canBuy = Boolean(
    product &&
      (hasVariations ? resolvedVariation && (resolvedVariation.stock ?? 0) > 0 : currentStock > 0)
  );

  return {
    attributes,
    hasVariations,
    selected,
    select,
    optionsByAttribute,
    resolvedVariation,
    currentStock,
    canBuy,
  };
}
