import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { listPublicProducts } from "../services/productService";
import { usePublicCategories } from "./usePublicCategories";

const DEFAULT_SORT = "recentes";

// Catálogo público: filtro (categoria por slug), ordenação e busca vivem na
// URL (R-6); paginação por cursor com "carregar mais" que ANEXA (R-8). A URL é
// a fonte de verdade dos filtros — mudar filtro reinicia a lista.
export function useCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { idBySlug, loading: categoriesLoading } = usePublicCategories();

  const categoria = searchParams.get("categoria") || "";
  const ordenar = searchParams.get("ordenar") || DEFAULT_SORT;
  const q = searchParams.get("q") || "";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef(null);
  const requestIdRef = useRef(0);

  // Categoria na URL é slug; a consulta usa categoryId. Espera as categorias
  // carregarem para resolver o slug (evita filtrar por id vazio e mostrar tudo).
  const categoryId = categoria ? idBySlug[categoria] || "__none__" : "";

  const fetchFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    cursorRef.current = null;

    try {
      // Slug desconhecido (__none__) → sem resultados, sem consultar.
      if (categoryId === "__none__") {
        if (requestId === requestIdRef.current) {
          setItems([]);
          setHasMore(false);
        }
        return;
      }

      const result = await listPublicProducts({
        categoryId,
        sort: ordenar,
        search: q,
        cursor: null,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setItems(result.items);
      setHasMore(result.hasMore);
      cursorRef.current = result.nextCursor;
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [categoryId, ordenar, q]);

  // Só consulta depois que as categorias carregaram (para resolver o slug).
  // Sem categoria, `ready` é sempre true — não depender de `categoriesLoading`
  // diretamente evita um segundo fetch quando ele deixa de carregar.
  const ready = !categoria || !categoriesLoading;

  useEffect(() => {
    if (!ready) {
      return;
    }

    fetchFirstPage();
  }, [fetchFirstPage, ready]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) {
      return;
    }

    const requestId = requestIdRef.current;

    try {
      const result = await listPublicProducts({
        categoryId,
        sort: ordenar,
        search: q,
        cursor: cursorRef.current,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setItems((current) => [...current, ...result.items]);
      setHasMore(result.hasMore);
      cursorRef.current = result.nextCursor;
    } catch (err) {
      setError(err);
    }
  }, [categoryId, ordenar, q, hasMore, loading]);

  // Atualiza filtros na URL; mudar qualquer um reinicia a paginação.
  const setFilters = useCallback(
    (changes) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        for (const [key, value] of Object.entries(changes)) {
          if (!value || (key === "ordenar" && value === DEFAULT_SORT)) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }

        return next;
      });
    },
    [setSearchParams]
  );

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh: fetchFirstPage,
    filters: { categoria, ordenar, q },
    setFilters,
  };
}
