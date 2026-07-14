import { useCallback, useEffect, useState } from "react";

import { getPublicProduct } from "../services/productService";

// Carga da página de produto (feature 005). Carrega o produto público
// (getPublicProduct → null vira notFound/404). A seleção de variação vive no
// useVariationSelection (feature 008).
export function useProductPage(id) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

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

  return { product, loading, notFound, error, refresh: load };
}
