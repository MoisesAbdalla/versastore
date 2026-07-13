import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import FormField from "../../components/form/FormField";
import Checkbox from "../../components/form/Checkbox";
import { useAuth } from "../../contexts/AuthContext";
import { completeProfile } from "../../services/userService";
import { useAuthForm } from "../../hooks/useAuthForm";
import { validatePhone, maskPhone, validateTermsAccepted } from "../../utils/validation";
import { TERMS_VERSION } from "../../constants/terms";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

const schema = {
  phone: (v) => validatePhone(v),
  terms: (v) => validateTermsAccepted(v),
};

// Passo pós-Google: coleta telefone + aceite dos termos p/ completar o cadastro.
function CompleteProfile() {
  const navigate = useNavigate();
  const { user, profile, reloadProfile } = useAuth();
  const { values, errors, touched, setField, blurField, validateAll } = useAuthForm(
    { phone: profile?.phone || "", terms: false },
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
      await completeProfile(user.uid, { phone: values.phone, termsVersion: TERMS_VERSION });
      await reloadProfile();
      navigate(ROUTES.HOME);
    } catch {
      setSubmitError("Não foi possível salvar seus dados. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className={styles.page}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <h1 className={styles.title}>Complete seu cadastro</h1>
          <p className={styles.subtitle}>
            Só falta o telefone e o aceite dos termos para você aproveitar a Versa Store.
          </p>

          {submitError && (
            <p className={styles.formError} role="alert">
              {submitError}
            </p>
          )}

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
            {submitting ? "Salvando…" : "Concluir cadastro"}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}

export default CompleteProfile;
