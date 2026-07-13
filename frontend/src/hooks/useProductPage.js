import { useCallback, useEffect, useState } from "react";

import { getPublicProduct } from "../services/productService";

// Estado da página de produto (feature 005). Carrega o produto público
// (getPublicProduct → null vira notFound/404) e gerencia a variação
// selecionada, o estoque atual e se é possível comprar.
export function useProductPage(id) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [selection, setSelection] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setSelection(null);

    try {
      const data = await getPublicProduct(id);

      if (!data) {
        setNotFound(true);
        setProduct(null);
      } else {
        setProduct(data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const hasVariations = (product?.variations || []).length > 0;

  // Estoque exibido: da variação selecionada quando há variações; senão o do
  // produto simples.
  const currentStock = hasVariations
    ? selection?.stock ?? null
    : product?.stock ?? product?.totalStock ?? 0;

  // Pode comprar: produto carregado, e (sem variações com estoque) OU
  // (variação selecionada com estoque).
  const canBuy = Boolean(
    product && (hasVariations ? selection && selection.stock > 0 : currentStock > 0)
  );

  const selectVariation = useCallback((variation) => setSelection(variation), []);

  return {
    product,
    loading,
    notFound,
    error,
    selection,
    selectVariation,
    hasVariations,
    currentStock,
    canBuy,
    refresh: load,
  };
}
