import { useId } from "react";
import styles from "./styles.module.css";

// Campo de formulário da loja (feature 007): rótulo + input + erro campo a
// campo, nos tokens de variables.css. O erro só aparece após o campo ser
// tocado (onBlur) ou numa tentativa de submit.
function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  autoComplete,
  inputMode,
  disabled,
  hint,
  children,
}) {
  const id = useId();
  const showError = touched && error;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>

      {children ? (
        children({ id, invalid: Boolean(showError) })
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          aria-invalid={Boolean(showError)}
          aria-describedby={showError ? `${id}-error` : undefined}
          className={showError ? `${styles.input} ${styles.inputError}` : styles.input}
        />
      )}

      {hint && !showError && <span className={styles.hint}>{hint}</span>}

      {showError && (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default FormField;
