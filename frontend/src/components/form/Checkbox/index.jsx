import { useId } from "react";
import styles from "./styles.module.css";

// Checkbox da loja (feature 007) — usado no aceite de termos. `label` aceita
// nós (para incluir links a /termos e /privacidade).
function Checkbox({ checked, onChange, error, touched, children }) {
  const id = useId();
  const showError = touched && error;

  return (
    <div className={styles.wrapper}>
      <label className={styles.row} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={styles.checkbox}
          aria-invalid={Boolean(showError)}
        />
        <span className={styles.label}>{children}</span>
      </label>

      {showError && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default Checkbox;
