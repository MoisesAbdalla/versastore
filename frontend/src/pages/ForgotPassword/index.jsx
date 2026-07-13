import { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import FormField from "../../components/form/FormField";
import { resetPassword } from "../../services/authService";
import { useAuthForm } from "../../hooks/useAuthForm";
import { validateEmail } from "../../utils/validation";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

const schema = {
  email: (v) => validateEmail(v),
};

// "Esqueci minha senha" (feature 007): envia o e-mail de redefinição via
// Firebase. Resposta sempre neutra — não revela se a conta existe (SC-005).
function ForgotPassword() {
  const { values, errors, touched, setField, blurField, validateAll } = useAuthForm(
    { email: "" },
    schema
  );

  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);

    if (!validateAll()) {
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword(values.email.trim());
      setSent(true);
    } catch {
      setSubmitError("Não foi possível enviar o e-mail agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Recuperar senha</h1>

          {sent ? (
            <>
              <p className={styles.subtitle}>
                Se houver uma conta com esse e-mail, enviamos um link para você redefinir a senha.
                Verifique a caixa de entrada e o spam.
              </p>
              <Link className={styles.backLink} to={ROUTES.LOGIN}>
                Voltar para o login
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <p className={styles.subtitle}>
                Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
              </p>

              {submitError && (
                <p className={styles.formError} role="alert">
                  {submitError}
                </p>
              )}

              <FormField
                label="E-mail"
                type="email"
                value={values.email}
                onChange={(v) => setField("email", v)}
                onBlur={() => blurField("email")}
                error={errors.email}
                touched={touched.email}
                autoComplete="email"
                inputMode="email"
              />

              <button className={styles.submit} type="submit" disabled={submitting}>
                {submitting ? "Enviando…" : "Enviar link de redefinição"}
              </button>

              <p className={styles.switch}>
                Lembrou a senha? <Link to={ROUTES.LOGIN}>Entrar</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default ForgotPassword;
