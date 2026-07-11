import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// Sincroniza filtros/busca/ordenação/cursor com os query params da URL (research R-6),
// para que a listagem sobreviva à navegação detalhe → voltar (FR-085) e seja compartilhável.
// `defaults` define os campos gerenciados e seus valores padrão (omitidos da URL).
export function useListState(defaults) {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const result = {};

    for (const key of Object.keys(defaults)) {
      result[key] = searchParams.has(key) ? searchParams.get(key) : defaults[key];
    }

    return result;
  }, [searchParams, defaults]);

  const setState = useCallback(
    (changes) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        for (const [key, value] of Object.entries(changes)) {
          if (value === undefined || value === null || value === "" || value === defaults[key]) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        }

        return next;
      });
    },
    [setSearchParams, defaults]
  );

  // Mudar filtro/busca/ordenação invalida o cursor: volta à primeira página.
  const setFilters = useCallback(
    (changes) => {
      setState({ ...changes, after: null, page: null });
    },
    [setState]
  );

  return { state, setState, setFilters };
}
