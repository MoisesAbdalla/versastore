import { Link } from "react-router-dom";
import styles from "./styles.module.css";

// Estado vazio com orientação de próximo passo (FR-084).
function EmptyState({ title, description, actionLabel, actionTo }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.title}>{title}</p>

      {description && <p className={styles.description}>{description}</p>}

      {actionLabel && actionTo && (
        <Link className={styles.action} to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
