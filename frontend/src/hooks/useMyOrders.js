import { useCallback, useEffect, useRef, useState } from "react";

import { listMyOrders } from "../services/orderService";

// "Meus pedidos" do cliente logado (feature 007, US4): primeira página no
// mount + "carregar mais" por cursor que ANEXA. Sem filtros (a área é só do
// próprio cliente). Ignora respostas obsoletas via requestId.
export function useMyOrders(uid) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef(null);
  const requestIdRef = useRef(0);

  const fetchFirstPage = useCallback(async () => {
    if (!uid) {
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    cursorRef.current = null;

    try {
      const result = await listMyOrders(uid, { cursor: null });

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
  }, [uid]);

  const loadMore = useCallback(async () => {
    if (!uid || !cursorRef.current) {
      return;
    }

    const requestId = requestIdRef.current;

    setLoadingMore(true);

    try {
      const result = await listMyOrders(uid, { cursor: cursorRef.current });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      cursorRef.current = result.nextCursor;
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMore(false);
      }
    }
  }, [uid]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  return { items, loading, loadingMore, error, hasMore, loadMore, refresh: fetchFirstPage };
}
