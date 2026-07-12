import { useEffect, useState } from "react";

import { getHomeSettings, DEFAULT_IMAGE_POSITION } from "../services/settingsService";

// Precisa ter o MESMO shape do retorno de getHomeSettings: este valor é o que
// os componentes da Home leem antes do Firestore responder (e no fallback de
// erro) — campo faltando aqui derruba a vitrine inteira.
const EMPTY = {
  heroImage: null,
  heroPosition: DEFAULT_IMAGE_POSITION,
  categoryImages: {},
  categoryPositions: {},
};

// Cache de módulo: HeroBanner e Categories montam juntos na Home — uma única
// leitura do settings/home por carregamento de página.
let cachedPromise = null;

function loadOnce() {
  if (!cachedPromise) {
    cachedPromise = getHomeSettings().catch(() => {
      cachedPromise = null; // permite nova tentativa no próximo mount
      return EMPTY;
    });
  }

  return cachedPromise;
}

// Usado pela LOJA: renderiza imediatamente com os assets padrão e troca para
// a imagem customizada quando o settings chega — falha de rede nunca quebra
// a Home (fica no padrão).
export function useHomeSettings() {
  const [settings, setSettings] = useState(EMPTY);

  useEffect(() => {
    let cancelled = false;

    loadOnce().then((data) => {
      if (!cancelled) {
        setSettings(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
