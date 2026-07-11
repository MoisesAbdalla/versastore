import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import auth from "../firebase/auth";
import { ensureUserProfile } from "../services/userService";
import { ROLES } from "../constants/roles";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // ensureUserProfile cria o doc users/{uid} como customer se não
          // existir — cobre contas registradas antes da coleção users existir.
          const profile = await ensureUserProfile(currentUser);

          setRole(profile ? profile.role : null);
        } catch {
          // Sem perfil legível (ex.: rules negaram) trata como sem papel:
          // o AdminRoute nega acesso e a loja continua funcionando.
          setRole(null);
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        role,
        isAdmin: role === ROLES.ADMIN,
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
