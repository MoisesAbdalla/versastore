import { useState } from "react";
import FormField from "../../../components/form/FormField";
import EmptyState from "../../../components/EmptyState";
import { useAuth } from "../../../contexts/AuthContext";
import { saveAddress, removeAddress, setDefaultAddress } from "../../../services/userService";
import { lookupCep } from "../../../services/cepService";
import { validateCep, maskCep, onlyDigits } from "../../../utils/validation";
import styles from "./styles.module.css";

const EMPTY_FORM = {
  id: null,
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  isDefault: false,
};

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `addr-${Date.now()}`;
}

// Aba "Meus endereços" (feature 007, US5): CRUD com busca por CEP (ViaCEP).
// Os endereços vivem em users.addresses (o próprio usuário edita).
function AccountAddresses() {
  const { user, profile, reloadProfile } = useAuth();
  const addresses = profile?.addresses || [];

  const [form, setForm] = useState(null); // null = fechado; objeto = editando/criando
  const [errors, setErrors] = useState({});
  const [cepStatus, setCepStatus] = useState(null); // "buscando" | "manual" | null
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function openNew() {
    setForm({ ...EMPTY_FORM, isDefault: addresses.length === 0 });
    setErrors({});
    setCepStatus(null);
    setError(null);
  }

  function openEdit(address) {
    setForm({ ...EMPTY_FORM, ...address });
    setErrors({});
    setCepStatus(null);
    setError(null);
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCepBlur() {
    const cepError = validateCep(form.cep);

    if (cepError) {
      setErrors((e) => ({ ...e, cep: cepError }));
      return;
    }

    setErrors((e) => ({ ...e, cep: null }));
    setCepStatus("buscando");

    const found = await lookupCep(form.cep);

    if (found) {
      setForm((prev) => ({
        ...prev,
        street: found.street || prev.street,
        neighborhood: found.neighborhood || prev.neighborhood,
        city: found.city || prev.city,
        state: found.state || prev.state,
      }));
      setCepStatus(null);
    } else {
      // Não bloqueia: o cliente preenche na mão (SC-007).
      setCepStatus("manual");
    }
  }

  function validate() {
    const next = {};

    if (validateCep(form.cep)) next.cep = validateCep(form.cep);
    if (!form.street.trim()) next.street = "Informe a rua.";
    if (!form.number.trim()) next.number = "Informe o número.";
    if (!form.neighborhood.trim()) next.neighborhood = "Informe o bairro.";
    if (!form.city.trim()) next.city = "Informe a cidade.";
    if (!onlyDigits(form.state) && form.state.trim().length !== 2) next.state = "UF inválida.";

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      await saveAddress(user.uid, {
        ...form,
        id: form.id || newId(),
        cep: maskCep(form.cep),
        state: form.state.trim().toUpperCase(),
      });
      await reloadProfile();
      setForm(null);
    } catch {
      setError("Não foi possível salvar o endereço. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    setError(null);

    try {
      await removeAddress(user.uid, id);
      await reloadProfile();
    } catch {
      setError("Não foi possível remover o endereço.");
    }
  }

  async function handleSetDefault(id) {
    setError(null);

    try {
      await setDefaultAddress(user.uid, id);
      await reloadProfile();
    } catch {
      setError("Não foi possível definir o endereço padrão.");
    }
  }

  return (
    <div className={styles.wrap}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {addresses.length === 0 && !form && (
        <EmptyState
          title="Você ainda não cadastrou endereços"
          description="Cadastre um endereço para agilizar suas compras."
          actionLabel="+ Adicionar endereço"
          actionOnClick={openNew}
        />
      )}

      {addresses.length > 0 && (
        <ul className={styles.list}>
          {addresses.map((address) => (
            <li key={address.id} className={styles.card}>
              <div className={styles.cardBody}>
                {address.isDefault && <span className={styles.defaultTag}>Padrão</span>}
                <p className={styles.cardLine}>
                  {address.street}, {address.number}
                  {address.complement ? ` — ${address.complement}` : ""}
                </p>
                <p className={styles.cardMuted}>
                  {address.neighborhood} — {address.city}/{address.state} · CEP {address.cep}
                </p>
              </div>

              <div className={styles.cardActions}>
                {!address.isDefault && (
                  <button type="button" className={styles.linkBtn} onClick={() => handleSetDefault(address.id)}>
                    Tornar padrão
                  </button>
                )}
                <button type="button" className={styles.linkBtn} onClick={() => openEdit(address)}>
                  Editar
                </button>
                <button
                  type="button"
                  className={`${styles.linkBtn} ${styles.danger}`}
                  onClick={() => handleRemove(address.id)}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <h3 className={styles.formTitle}>{form.id ? "Editar endereço" : "Novo endereço"}</h3>

          <FormField
            label="CEP"
            value={form.cep}
            onChange={(v) => setField("cep", maskCep(v))}
            onBlur={handleCepBlur}
            error={errors.cep}
            touched={Boolean(errors.cep)}
            inputMode="numeric"
            placeholder="00000-000"
            hint={
              cepStatus === "buscando"
                ? "Buscando endereço…"
                : cepStatus === "manual"
                  ? "Não encontramos esse CEP — preencha os campos manualmente."
                  : undefined
            }
          />

          <FormField
            label="Rua"
            value={form.street}
            onChange={(v) => setField("street", v)}
            error={errors.street}
            touched={Boolean(errors.street)}
          />

          <div className={styles.row}>
            <FormField
              label="Número"
              value={form.number}
              onChange={(v) => setField("number", v)}
              error={errors.number}
              touched={Boolean(errors.number)}
            />
            <FormField
              label="Complemento (opcional)"
              value={form.complement}
              onChange={(v) => setField("complement", v)}
            />
          </div>

          <FormField
            label="Bairro"
            value={form.neighborhood}
            onChange={(v) => setField("neighborhood", v)}
            error={errors.neighborhood}
            touched={Boolean(errors.neighborhood)}
          />

          <div className={styles.row}>
            <FormField
              label="Cidade"
              value={form.city}
              onChange={(v) => setField("city", v)}
              error={errors.city}
              touched={Boolean(errors.city)}
            />
            <FormField
              label="UF"
              value={form.state}
              onChange={(v) => setField("state", v.toUpperCase().slice(0, 2))}
              error={errors.state}
              touched={Boolean(errors.state)}
              placeholder="SP"
            />
          </div>

          <label className={styles.check}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setField("isDefault", e.target.checked)}
            />
            Usar como endereço padrão
          </label>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submit} disabled={saving}>
              {saving ? "Salvando…" : "Salvar endereço"}
            </button>
            <button type="button" className={styles.cancel} onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        addresses.length > 0 && (
          <button type="button" className={styles.addBtn} onClick={openNew}>
            + Adicionar endereço
          </button>
        )
      )}
    </div>
  );
}

export default AccountAddresses;
