import { useState } from "react";
import FormField from "../../../components/form/FormField";
import { useAuth } from "../../../contexts/AuthContext";
import { updatePersonalData } from "../../../services/userService";
import { resetPassword, updateDisplayName } from "../../../services/authService";
import { useAuthForm } from "../../../hooks/useAuthForm";
import { validateName, validatePhone, maskPhone } from "../../../utils/validation";
import styles from "./styles.module.css";

const schema = {
  name: (v) => validateName(v),
  phone: (v) => validatePhone(v),
};

// Aba "Meus dados" (feature 007): edição de nome e telefone + ação de alterar
// senha (via e-mail de redefinição do Firebase — sem reautenticação na tela).
function PersonalData() {
  const { user, profile, reloadProfile } = useAuth();
  const { values, errors, touched, setField, blurField, validateAll } = useAuthForm(
    { name: profile?.name || "", phone: profile?.phone || "" },
    schema
  );

  const [status, setStatus] = useState(null); // { type: "ok" | "erro", msg }
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (!validateAll()) {
      return;
    }

    setSaving(true);

    try {
      const name = values.name.trim();

      await updatePersonalData(user.uid, { name, phone: values.phone });
      await updateDisplayName(name);
      await reloadProfile();
      setStatus({ type: "ok", msg: "Dados atualizados." });
    } catch {
      setStatus({ type: "erro", msg: "Não foi possível salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    setResetSent(false);

    try {
      await resetPassword(profile?.email || user?.email);
      setResetSent(true);
    } catch {
      setStatus({ type: "erro", msg: "Não foi possível enviar o e-mail agora." });
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.sectionTitle}>Dados pessoais</h2>

        {status && (
          <p className={status.type === "ok" ? styles.ok : styles.error} role="alert">
            {status.msg}
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
          value={profile?.email || user?.email || ""}
          onChange={() => {}}
          disabled
          hint="O e-mail é usado para entrar e não pode ser alterado aqui."
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

        <button className={styles.submit} type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>

      <div className={styles.divider} />

      <section className={styles.form}>
        <h2 className={styles.sectionTitle}>Alterar senha</h2>
        <p className={styles.help}>
          Enviamos um link seguro para o seu e-mail para você definir uma nova senha.
        </p>

        {resetSent ? (
          <p className={styles.ok}>
            Link enviado para {profile?.email || user?.email}. Verifique a caixa de entrada e o spam.
          </p>
        ) : (
          <button className={styles.secondary} type="button" onClick={handleResetPassword}>
            Enviar link de redefinição
          </button>
        )}
      </section>
    </div>
  );
}

export default PersonalData;
