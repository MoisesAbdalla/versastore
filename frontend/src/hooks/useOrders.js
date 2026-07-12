import { useCallback } from "react";

import {
  listOrders,
  advanceStatus,
  cancelOrder,
  returnOrder,
  setTrackingCode,
  setInternalNotes,
} from "../services/orderService";
import { ORDER_STATUS_LABELS } from "../constants/orderStatus";
import { useAuth } from "../contexts/AuthContext";
import { useFeedback } from "../contexts/FeedbackContext";

// Ações de pedidos com autor (usuário logado) e feedback padrão.
export function useOrders() {
  const { user } = useAuth();
  const { toastSuccess, toastError } = useFeedback();

  const author = useCallback(
    () => ({ byUid: user?.uid || "", byName: user?.displayName || user?.email || "" }),
    [user]
  );

  const fetchOrders = useCallback((params) => listOrders(params), []);

  const advance = useCallback(
    async (id, nextStatus) => {
      try {
        await advanceStatus(id, nextStatus, author());
        toastSuccess(`Pedido atualizado para "${ORDER_STATUS_LABELS[nextStatus]}".`);
        return true;
      } catch (error) {
        toastError(error.message || "Erro ao atualizar o status.");
        return false;
      }
    },
    [author, toastSuccess, toastError]
  );

  const cancel = useCallback(
    async (id, reason) => {
      try {
        await cancelOrder(id, { reason, ...author() });
        toastSuccess("Pedido cancelado. Itens devolvidos ao estoque.");
        return true;
      } catch (error) {
        toastError(error.message || "Erro ao cancelar o pedido.");
        return false;
      }
    },
    [author, toastSuccess, toastError]
  );

  const markReturned = useCallback(
    async (id, reason) => {
      try {
        await returnOrder(id, { reason, ...author() });
        toastSuccess("Devolução registrada. Itens devolvidos ao estoque.");
        return true;
      } catch (error) {
        toastError(error.message || "Erro ao registrar a devolução.");
        return false;
      }
    },
    [author, toastSuccess, toastError]
  );

  const saveTracking = useCallback(
    async (id, code) => {
      try {
        await setTrackingCode(id, code);
        toastSuccess("Código de rastreio salvo.");
        return true;
      } catch (error) {
        toastError(error.message || "Erro ao salvar o rastreio.");
        return false;
      }
    },
    [toastSuccess, toastError]
  );

  const saveNotes = useCallback(
    async (id, notes) => {
      try {
        await setInternalNotes(id, notes);
        toastSuccess("Notas internas salvas.");
        return true;
      } catch (error) {
        toastError(error.message || "Erro ao salvar as notas.");
        return false;
      }
    },
    [toastSuccess, toastError]
  );

  return { fetchOrders, advance, cancel, markReturned, saveTracking, saveNotes };
}
