import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ROUTES from "../constants/routes";

// Guard de sessão: exige usuário autenticado; anônimo vai ao login.
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
}

export default PrivateRoute;
