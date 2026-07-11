import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ROUTES from "../constants/routes";

// Guard de papel (US1): admin renderiza; logado sem papel é redirecionado para
// fora do painel com mensagem clara; anônimo vai ao login. A proteção real dos
// dados está nas firestore.rules — este guard é só a camada de navegação.
function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!isAdmin) {
    return <Navigate to={ROUTES.ACCESS_DENIED} replace />;
  }

  return children;
}

export default AdminRoute;
