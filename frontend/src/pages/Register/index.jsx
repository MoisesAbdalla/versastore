import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import FormField from "../../components/form/FormField";
import PasswordField from "../../components/form/PasswordField";
import Checkbox from "../../components/form/Checkbox";
import { register } from "../../services/authService";
import { useAuth } from "../../contexts/AuthContext";
import { useAuthForm } from "../../hooks/useAuthForm";
import {
  validateName,
  validateEmail,
  validatePhone,
  maskPhone,
  validatePassword,
  validatePasswordConfirm,
  validateTermsAccepted,
} from "../../utils/validation";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

const schema = {
  name: (v) => validateName(v),
  email: (v) => validateEmail(v),
  phone: (v) => validatePhone(v),
  password: (v) => validatePassword(v),
  passwordConfirm: (v, values) => validatePasswordConfirm(values.password, v),
  terms: (v) => validateTermsAccepted(v),
};

function Register() {
  const navigate = useNavigate();
  const { setUser, reloadProfile } = useAuth();
  const { values, errors, touched, setField, blurField, validateAll } = useAuthForm(
    { name: "", email: "", phone: "", password: "", passwordConfirm: "", terms: false },
    schema
  );

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
      const user = await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone,
        termsAccepted: values.terms,
      });

      setUser(user);
      await reloadProfile();
      navigate(ROUTES.HOME);
    } catch (error) {
      if (error.code === "email-em-uso") {
        setSubmitError("Este e-mail já está cadastrado. Tente entrar.");
      } else {
        setSubmitError("Não foi possível criar a conta. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className={styles.page}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <h1 className={styles.title}>Criar conta</h1>
          <p className={styles.subtitle}>É rápido — e você acompanha seus pedidos.</p>

          {submitError && (
            <p className={styles.formError} role="alert">
              {submitError}
            </p>
          )}

          <FormField
            label="Nome completo"
            value={values.name}
            onChange={(v) => setField("name", v)}
            onBlur={() => blurField("name")}
            error={errors.name}
            touched={touched.name}
            autoComplete="name"
          />

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

          <FormField
            label="Telefone / WhatsApp"
            value={values.phone}
            onChange={(v) => setField("phone", maskPhone(v))}
            onBlur={() => blurField("phone")}
            error={errors.phone}
            touched={touched.phone}
            autoComplete="tel"
            inputMode="tel"
            placeholder="(11) 91234-5678"
          />

          <PasswordField
            label="Senha"
            value={values.password}
            onChange={(v) => setField("password", v)}
            onBlur={() => blurField("password")}
            error={errors.password}
            touched={touched.password}
            autoComplete="new-password"
            showStrength
          />

          <PasswordField
            label="Confirmar senha"
            value={values.passwordConfirm}
            onChange={(v) => setField("passwordConfirm", v)}
            onBlur={() => blurField("passwordConfirm")}
            error={errors.passwordConfirm}
            touched={touched.passwordConfirm}
            autoComplete="new-password"
          />

          <Checkbox
            checked={values.terms}
            onChange={(v) => setField("terms", v)}
            error={errors.terms}
            touched={touched.terms}
          >
            Li e aceito os{" "}
            <Link to={ROUTES.TERMOS} target="_blank">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link to={ROUTES.PRIVACIDADE} target="_blank">
              Política de Privacidade
            </Link>
            .
          </Checkbox>

          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? "Criando conta…" : "Criar conta"}
          </button>

          <p className={styles.switch}>
            Já tem conta?{" "}
            <Link to={ROUTES.LOGIN}>Entrar</Link>
          </p>
        </form>
      </div>
    </MainLayout>
  );
}

export default Register;
