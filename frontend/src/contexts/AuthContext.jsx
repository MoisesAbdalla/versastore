import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import auth from "../firebase/auth";
import { ensureUserProfile, getFullProfile, isProfileComplete } from "../services/userService";
import { ROLES } from "../constants/roles";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Recarrega o perfil do usuário atual (após cadastro/edição de dados).
  const reloadProfile = useCallback(async () => {
    const current = auth.currentUser;

    if (!current) {
      setProfile(null);
      return null;
    }

    try {
      const fresh = await getFullProfile(current.uid);
      setProfile(fresh);
      return fresh;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Rede de segurança p/ contas legadas sem doc; register/Google já
          // gravam o doc de forma autoritativa.
          await ensureUserProfile(currentUser);
          setProfile(await getFullProfile(currentUser.uid));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const role = profile?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        profile,
        role,
        isAdmin: role === ROLES.ADMIN,
        // Logado, mas sem telefone/aceite (Google recém-entrado ou conta legada).
        profileIncomplete: Boolean(user) && Boolean(profile) && !isProfileComplete(profile),
        reloadProfile,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
