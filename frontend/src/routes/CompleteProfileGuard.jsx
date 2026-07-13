import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ROUTES from "../constants/routes";

// Guard do passo "complete seu cadastro": exige usuário logado e só deixa
// passar quem ainda tem o cadastro incompleto (telefone/aceite pendentes).
function CompleteProfileGuard({ children }) {
  const { user, profileIncomplete, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!profileIncomplete) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return children;
}

export default CompleteProfileGuard;
