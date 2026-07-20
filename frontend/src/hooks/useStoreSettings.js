import { useEffect, useState } from "react";

import { getStoreSettings } from "../services/settingsService";

// Dados da loja (settings/store) com cache de módulo — 1 leitura por
// carregamento, para o Footer/Contato/Sobre. Feature 017 / M8.
const EMPTY = { razaoSocial: "", cnpj: "", endereco: "", email: "", telefone: "", whatsapp: "" };

let cachedPromise = null;

function loadOnce() {
  if (!cachedPromise) {
    cachedPromise = getStoreSettings().catch(() => {
      cachedPromise = null;
      return EMPTY;
    });
  }

  return cachedPromise;
}

export function useStoreSettings() {
  const [settings, setSettings] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadOnce().then((data) => {
      if (!cancelled) {
        setSettings(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { ...settings, loading };
}
