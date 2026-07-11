import { useCallback, useEffect, useMemo, useState } from "react";

import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  moveProducts,
} from "../services/categoryService";
import { useFeedback } from "../contexts/FeedbackContext";

// Árvore de categorias + mutações com feedback. `flat` achata a árvore para
// selects (subcategorias rotuladas "Pai > Filha").
export function useCategories() {
  const { toastSuccess, toastError } = useFeedback();

  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setTree(await listCategories());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flat = useMemo(() => {
    const result = [];

    for (const root of tree) {
      result.push({ id: root.id, name: root.name, label: root.name, parentId: null });

      for (const child of root.children || []) {
        result.push({
          id: child.id,
          name: child.name,
          label: `${root.name} > ${child.name}`,
          parentId: root.id,
        });
      }
    }

    return result;
  }, [tree]);

  const create = useCallback(
    async (data) => {
      try {
        await createCategory(data);
        toastSuccess("Categoria criada.");
        await refresh();
        return true;
      } catch (err) {
        toastError(err.message || "Erro ao criar a categoria.");
        return false;
      }
    },
    [refresh, toastSuccess, toastError]
  );

  const update = useCallback(
    async (id, changes) => {
      try {
        await updateCategory(id, changes);
        toastSuccess("Categoria atualizada.");
        await refresh();
        return true;
      } catch (err) {
        toastError(err.message || "Erro ao atualizar a categoria.");
        return false;
      }
    },
    [refresh, toastSuccess, toastError]
  );

  // Retorna o code do erro para a página abrir o fluxo de "mover produtos".
  const remove = useCallback(
    async (id) => {
      try {
        await deleteCategory(id);
        toastSuccess("Categoria excluída.");
        await refresh();
        return { ok: true };
      } catch (err) {
        if (err.code !== "categoria-com-produtos") {
          toastError(err.message || "Erro ao excluir a categoria.");
        }

        return { ok: false, code: err.code };
      }
    },
    [refresh, toastSuccess, toastError]
  );

  const move = useCallback(
    async (fromId, toId) => {
      try {
        const count = await moveProducts(fromId, toId);
        toastSuccess(`${count} produto(s) movido(s).`);
        return true;
      } catch (err) {
        toastError(err.message || "Erro ao mover os produtos.");
        return false;
      }
    },
    [toastSuccess, toastError]
  );

  return { tree, flat, loading, error, refresh, create, update, remove, move };
}
