import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./AuthContext";
import { addToWishlist, removeFromWishlist } from "../services/userService";

// Lista de desejos (feature 014). Guardada no doc do usuário (users.wishlist)
// como array de productIds — só para usuários logados (clicar sem login leva ao
// login, decisão do componente). O estado é semeado a partir do perfil e
// atualizado de forma otimista para o coração responder na hora, persistindo em
// segundo plano; falha reverte.

// Default seguro: consumidores fora de um provider (ex.: testes de render de
// componentes isolados) recebem uma lista vazia e ações no-op, sem quebrar.
const WishlistContext = createContext({
  ids: [],
  count: 0,
  isFavorite: () => false,
  toggle: () => {},
});

export function WishlistProvider({ children }) {
  const { user, profile } = useAuth();
  const [ids, setIds] = useState([]);

  // Sincroniza com o perfil (login/logout/reload): a fonte de verdade é o doc.
  useEffect(() => {
    setIds(profile?.wishlist || []);
  }, [profile]);

  const isFavorite = useCallback((productId) => ids.includes(productId), [ids]);

  const toggle = useCallback(
    async (productId) => {
      if (!user) {
        return; // o chamador deve redirecionar ao login
      }

      const has = ids.includes(productId);
      // Otimista: atualiza a UI antes da rede.
      setIds((prev) => (has ? prev.filter((x) => x !== productId) : [...prev, productId]));

      try {
        if (has) {
          await removeFromWishlist(user.uid, productId);
        } else {
          await addToWishlist(user.uid, productId);
        }
      } catch {
        // Reverte se a escrita falhar.
        setIds((prev) => (has ? [...prev, productId] : prev.filter((x) => x !== productId)));
      }
    },
    [user, ids]
  );

  const value = useMemo(
    () => ({ ids, count: ids.length, isFavorite, toggle }),
    [ids, isFavorite, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}
