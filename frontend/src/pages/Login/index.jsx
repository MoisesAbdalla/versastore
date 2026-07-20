import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import FormField from "../../components/form/FormField";
import PasswordField from "../../components/form/PasswordField";
import GoogleButton from "../../components/form/GoogleButton";
import { login, loginWithGoogle } from "../../services/authService";
import { useAuth } from "../../contexts/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { isProfileComplete } from "../../services/userService";
import { useAuthForm } from "../../hooks/useAuthForm";
import { validateEmail } from "../../utils/validation";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

const schema = {
  email: (v) => validateEmail(v),
  password: (v) => (v ? null : "Informe sua senha."),
};

// Mensagens pt-BR para os códigos do Firebase Auth (sem alert genérico).
const LOGIN_ERRORS = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Tente novamente em instantes.",
};

function Login() {
  usePageMeta({ title: "Entrar", noindex: true });

  const navigate = useNavigate();
  const { setUser, reloadProfile } = useAuth();
  const { values, errors, touched, setField, blurField, validateAll } = useAuthForm(
    { email: "", password: "" },
    schema
  );

  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setSubmitError(null);
    setGoogleLoading(true);

    try {
      const user = await loginWithGoogle();
      setUser(user);
      const profile = await reloadProfile();
      navigate(isProfileComplete(profile) ? ROUTES.HOME : ROUTES.COMPLETAR_CADASTRO);
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
        setSubmitError("Não foi possível entrar com o Google. Tente novamente.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);

    if (!validateAll()) {
      return;
    }

    setSubmitting(true);

    try {
      const user = await login(values.email, values.password);
      setUser(user);
      navigate(ROUTES.HOME);
    } catch (error) {
      setSubmitError(LOGIN_ERRORS[error.code] || "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className={styles.page}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <h1 className={styles.title}>Entrar</h1>
          <p className={styles.subtitle}>Acesse sua conta Versa Store.</p>

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

          <PasswordField
            label="Senha"
            value={values.password}
            onChange={(v) => setField("password", v)}
            onBlur={() => blurField("password")}
            error={errors.password}
            touched={touched.password}
            autoComplete="current-password"
          />

          <Link className={styles.forgot} to={ROUTES.RECUPERAR_SENHA}>
            Esqueci minha senha
          </Link>

          <button className={styles.submit} type="submit" disabled={submitting || googleLoading}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>

          <div className={styles.divider}>
            <span>ou</span>
          </div>

          <GoogleButton onClick={handleGoogle} disabled={submitting || googleLoading} />

          <p className={styles.switch}>
            Não tem conta?{" "}
            <Link to={ROUTES.REGISTER}>Cadastre-se</Link>
          </p>
        </form>
      </div>
    </MainLayout>
  );
}

export default Login;
