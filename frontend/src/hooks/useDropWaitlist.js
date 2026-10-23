import { useCallback, useEffect, useState } from "react";

import { countWaitlist, joinWaitlist } from "../services/waitlistService";

// Estado da fila de espera + estoque restante de um drop (feature 019).
// `status` guia a UI: idle → submitting → success | error. Ao entrar na fila,
// o estoque restante cai em 1 imediatamente (otimista) e o e-mail é gravado.
// Se o Firestore falhar, volta para idle e expõe a mensagem de erro.

export function useDropWaitlist({ dropId, totalStock }) {
  const [reserved, setReserved] = useState(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    countWaitlist(dropId)
      .then((count) => {
        if (active) setReserved(count);
      })
      .catch(() => {
        // Sem contagem disponível ainda: mantém o estoque cheio, sem quebrar a página.
      });

    return () => {
      active = false;
    };
  }, [dropId]);

  const join = useCallback(
    async (email) => {
      setStatus("submitting");
      setError(null);

      try {
        await joinWaitlist(dropId, email);
        setReserved((n) => n + 1);
        setStatus("success");
        return true;
      } catch (err) {
        setError(err.message || "Não foi possível concluir sua inscrição.");
        setStatus("error");
        return false;
      }
    },
    [dropId],
  );

  const spotsLeft = Math.max(0, totalStock - reserved);

  return { spotsLeft, totalStock, status, error, join };
}
