import { useCallback, useEffect, useRef, useState } from "react";

// Paginação por cursor (startAfter + limit) — nunca offset (research R-6).
// `fetchPage(cursor)` deve retornar { items, nextCursor, hasMore }.
// A pilha de cursores fica em memória para "página anterior"; em deep-link,
// a navegação recomeça da primeira página (limitação documentada).
export function usePagination(fetchPage, deps = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const cursorsRef = useRef([null]);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (pageIndex) => {
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const cursor = cursorsRef.current[pageIndex - 1];
        const result = await fetchPage(cursor);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setItems(result.items);
        setHasMore(result.hasMore);
        setPage(pageIndex);

        cursorsRef.current = cursorsRef.current.slice(0, pageIndex);
        cursorsRef.current.push(result.nextCursor);
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchPage, ...deps]
  );

  useEffect(() => {
    cursorsRef.current = [null];
    load(1);
  }, [load]);

  const next = useCallback(() => {
    if (hasMore && !loading) {
      load(page + 1);
    }
  }, [hasMore, loading, load, page]);

  const prev = useCallback(() => {
    if (page > 1 && !loading) {
      load(page - 1);
    }
  }, [page, loading, load]);

  const refresh = useCallback(() => {
    load(page);
  }, [load, page]);

  return { items, loading, error, hasMore, page, next, prev, refresh };
}
