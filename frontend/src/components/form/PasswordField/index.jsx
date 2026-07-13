import { useId, useState } from "react";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import { passwordStrength, PASSWORD_STRENGTH_LABELS } from "../../../utils/validation";
import styles from "./styles.module.css";

// Campo de senha (feature 007): mostrar/ocultar + indicador de força opcional.
function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  error,
  touched,
  autoComplete = "current-password",
  showStrength = false,
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const showError = touched && error;
  const strength = showStrength ? passwordStrength(value) : 0;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>

      <div className={styles.inputWrap}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          aria-invalid={Boolean(showError)}
          className={showError ? `${styles.input} ${styles.inputError}` : styles.input}
        />

        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
        </button>
      </div>

      {showStrength && value && (
        <div className={styles.strength}>
          <div className={styles.bars} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={i < strength ? `${styles.bar} ${styles[`bar${strength}`]}` : styles.bar}
              />
            ))}
          </div>
          <span className={styles.strengthLabel}>{PASSWORD_STRENGTH_LABELS[strength]}</span>
        </div>
      )}

      {showStrength && (
        <span className={styles.hint}>Use ao menos 8 caracteres, com letras e números.</span>
      )}

      {showError && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default PasswordField;
