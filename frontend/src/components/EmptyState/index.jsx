import { Link } from "react-router-dom";
import styles from "./styles.module.css";

// Estado vazio com orientação de próximo passo (FR-084). O CTA deve ser a ação
// que resolve o vazio: um `actionOnClick` (ex.: abrir formulário) quando a ação
// acontece na própria página, ou um `actionTo` (link) quando leva a outro lugar.
function EmptyState({ title, description, actionLabel, actionTo, actionOnClick }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.title}>{title}</p>

      {description && <p className={styles.description}>{description}</p>}

      {actionLabel && actionOnClick && (
        <button type="button" className={styles.action} onClick={actionOnClick}>
          {actionLabel}
        </button>
      )}

      {actionLabel && actionTo && !actionOnClick && (
        <Link className={styles.action} to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
