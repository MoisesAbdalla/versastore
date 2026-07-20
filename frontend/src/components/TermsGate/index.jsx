import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { acceptCurrentTerms } from "../../services/userService";
import { TERMS_VERSION, needsTermsReaccept } from "../../constants/terms";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

// Gate de re-aceite dos termos (feature 017 / M8): quando os documentos legais
// mudam de versão, quem aceitou a anterior precisa aceitar de novo antes de usar
// a conta ou finalizar compras. Renderizado pelo PrivateRoute (/conta, /checkout)
// — a navegação pública nunca passa por aqui.
function TermsGate({ children }) {
  const { user, profile, reloadProfile } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  if (!user || !needsTermsReaccept(profile)) {
    return children;
  }

  async function handleAccept() {
    setSaving(true);
    setError(false);

    try {
      await acceptCurrentTerms(user.uid);
      await reloadProfile(); // needsTermsReaccept vira false → children renderizam
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Atualizamos nossos termos</h1>

        <p className={styles.text}>
          Publicamos novas versões dos nossos documentos legais. Para continuar usando sua conta e
          comprar na Versa Store, leia e aceite a versão vigente ({TERMS_VERSION}):
        </p>

        <ul className={styles.links}>
          <li>
            <Link to={ROUTES.TERMOS} target="_blank">
              Termos de uso
            </Link>
          </li>
          <li>
            <Link to={ROUTES.PRIVACIDADE} target="_blank">
              Política de privacidade
            </Link>
          </li>
          <li>
            <Link to={ROUTES.TROCAS} target="_blank">
              Política de trocas e devoluções (arrependimento em 7 dias)
            </Link>
          </li>
        </ul>

        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>
            Li e aceito os Termos de uso, a Política de privacidade e a Política de trocas (versão{" "}
            {TERMS_VERSION}).
          </span>
        </label>

        {error && (
          <p className={styles.error} role="alert">
            Não foi possível registrar o aceite. Tente novamente.
          </p>
        )}

        <button
          type="button"
          className={styles.accept}
          onClick={handleAccept}
          disabled={!checked || saving}
        >
          {saving ? "Registrando…" : "Aceitar e continuar"}
        </button>
      </div>
    </div>
  );
}

export default TermsGate;
