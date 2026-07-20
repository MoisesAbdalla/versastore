import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TermsGate from "../components/TermsGate";
import ROUTES from "../constants/routes";

// Guard de sessão: exige usuário autenticado; anônimo vai ao login.
// Feature 017: as áreas privadas (conta + checkout) passam pelo TermsGate —
// quem aceitou versão antiga dos termos re-aceita antes de continuar.
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <TermsGate>{children}</TermsGate>;
}

export default PrivateRoute;
