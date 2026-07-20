import { useEffect, useState } from "react";

import { getShippingSettings } from "../services/settingsService";

// Config de frete lida uma vez por carregamento (cache de módulo), como o
// useHomeSettings. Usada pelo banner (limite de frete grátis) e disponível
// para o checkout. Feature 011 / M5a.
const EMPTY = { rules: [], defaultRule: null, freeShippingThreshold: null, pickup: null };

let cachedPromise = null;

function loadOnce() {
  if (!cachedPromise) {
    cachedPromise = getShippingSettings().catch(() => {
      cachedPromise = null;
      return EMPTY;
    });
  }

  return cachedPromise;
}

export function useShippingSettings() {
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
