import { useCallback } from "react";

import {
  listProducts,
  deleteProduct,
  duplicateProduct,
  bulkUpdateProducts,
  bulkDeleteProducts,
} from "../services/productService";
import { useFeedback } from "../contexts/FeedbackContext";

// Ações de listagem/mutação de produtos com feedback padrão (toasts).
// A paginação em si fica com usePagination na página, que recebe fetchPage.
export function useProducts() {
  const { toastSuccess, toastError } = useFeedback();

  const fetchProducts = useCallback((params) => listProducts(params), []);

  const removeProduct = useCallback(
    async (id) => {
      try {
        const { soft } = await deleteProduct(id);

        toastSuccess(
          soft
            ? "Produto excluído. O histórico de pedidos foi preservado."
            : "Produto excluído definitivamente."
        );

        return true;
      } catch (error) {
        toastError(error.message || "Erro ao excluir o produto.");
        return false;
      }
    },
    [toastSuccess, toastError]
  );

  const duplicate = useCallback(
    async (id) => {
      try {
        const newId = await duplicateProduct(id);

        toastSuccess("Produto duplicado como rascunho. Defina um novo SKU.");

        return newId;
      } catch (error) {
        toastError(error.message || "Erro ao duplicar o produto.");
        return null;
      }
    },
    [toastSuccess, toastError]
  );

  const bulkUpdate = useCallback(
    async (ids, changes, successMessage) => {
      try {
        await bulkUpdateProducts(ids, changes);
        toastSuccess(successMessage || `${ids.length} produto(s) atualizado(s).`);
        return true;
      } catch (error) {
        toastError(error.message || "Erro ao atualizar os produtos selecionados.");
        return false;
      }
    },
    [toastSuccess, toastError]
  );

  const bulkDelete = useCallback(
    async (ids) => {
      try {
        const { softIds, hardIds } = await bulkDeleteProducts(ids);

        toastSuccess(`${softIds.length + hardIds.length} produto(s) excluído(s).`);

        return true;
      } catch (error) {
        toastError(error.message || "Erro ao excluir os produtos selecionados.");
        return false;
      }
    },
    [toastSuccess, toastError]
  );

  return { fetchProducts, removeProduct, duplicate, bulkUpdate, bulkDelete };
}
