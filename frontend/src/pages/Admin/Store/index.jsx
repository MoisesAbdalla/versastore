import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

import { getStoreSettings, updateStoreSettings } from "../../../services/settingsService";
import { useFeedback } from "../../../contexts/FeedbackContext";
import styles from "./styles.module.css";

// Máscara progressiva de CNPJ: 00.000.000/0000-00.
function maskCnpj(value) {
  const d = String(value || "").replace(/\D/g, "").slice(0, 14);

  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

// "Dados da loja" (feature 017 / M8): identificação do fornecedor exibida no
// rodapé e no Contato — exigência do e-commerce (Decreto 7.962/2013).
function StorePage() {
  const { toastSuccess, toastError } = useFeedback();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoreSettings()
      .then(setForm)
      .catch(() => toastError("Não foi possível carregar os dados da loja."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!form) {
    return <p className={styles.muted}>Carregando…</p>;
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const missingRequired = !form.razaoSocial.trim() || !form.cnpj.trim() || !form.endereco.trim();

  async function handleSave() {
    setSaving(true);

    try {
      await updateStoreSettings({
        razaoSocial: form.razaoSocial.trim(),
        cnpj: form.cnpj.trim(),
        endereco: form.endereco.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ""),
      });
      toastSuccess("Dados da loja salvos.");
    } catch {
      toastError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dados da loja</h1>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>

      {missingRequired && (
        <p className={styles.pending} role="alert">
          Preencha razão social, CNPJ e endereço antes de lançar a loja — a identificação da
          empresa no rodapé é exigência do comércio eletrônico (Decreto 7.962/2013).
        </p>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Identificação da empresa</h2>
        <TextField
          size="small"
          fullWidth
          label="Razão social"
          value={form.razaoSocial}
          onChange={(e) => set({ razaoSocial: e.target.value })}
        />
        <TextField
          size="small"
          label="CNPJ"
          value={form.cnpj}
          onChange={(e) => set({ cnpj: maskCnpj(e.target.value) })}
          placeholder="00.000.000/0000-00"
        />
        <TextField
          size="small"
          fullWidth
          label="Endereço completo"
          value={form.endereco}
          onChange={(e) => set({ endereco: e.target.value })}
          placeholder="Rua, número — bairro, cidade/UF, CEP"
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Canais de contato</h2>
        <p className={styles.hint}>Exibidos no rodapé e na página Contato. Vazios são omitidos.</p>
        <TextField
          size="small"
          label="E-mail"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
        />
        <TextField
          size="small"
          label="Telefone"
          value={form.telefone}
          onChange={(e) => set({ telefone: e.target.value })}
          placeholder="(11) 4000-0000"
        />
        <TextField
          size="small"
          label="WhatsApp (só números, com DDD)"
          value={form.whatsapp}
          onChange={(e) => set({ whatsapp: e.target.value })}
          placeholder="5511999999999"
        />
      </section>
    </div>
  );
}

export default StorePage;
