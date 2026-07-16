import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

import { getShippingSettings, updateShippingSettings } from "../../../services/settingsService";
import { validateShippingSettings } from "../../../utils/shipping";
import { useFeedback } from "../../../contexts/FeedbackContext";
import { parseBRLInput, centsToInput } from "../../../utils/format";
import { maskCep } from "../../../utils/validation";
import styles from "./styles.module.css";

// --- form <-> settings (dinheiro em texto BRL; centavos no doc) --------------
function toForm(settings) {
  return {
    rules: (settings.rules || []).map((r) => ({
      region: r.region || "",
      cepRanges: (r.cepRanges || []).map((x) => ({ from: maskCep(x.from), to: maskCep(x.to) })),
      priceText: centsToInput(r.price),
      etaDays: r.etaDays != null ? String(r.etaDays) : "",
      minText: r.minSubtotal != null ? centsToInput(r.minSubtotal) : "",
      maxText: r.maxSubtotal != null ? centsToInput(r.maxSubtotal) : "",
    })),
    defaultPriceText: settings.defaultRule ? centsToInput(settings.defaultRule.price) : "",
    defaultEta: settings.defaultRule?.etaDays != null ? String(settings.defaultRule.etaDays) : "",
    freeText: settings.freeShippingThreshold != null ? centsToInput(settings.freeShippingThreshold) : "",
  };
}

function toSettings(form) {
  const rules = form.rules.map((r) => {
    const rule = {
      region: r.region.trim(),
      cepRanges: r.cepRanges.map((x) => ({
        from: (x.from || "").replace(/\D/g, ""),
        to: (x.to || "").replace(/\D/g, ""),
      })),
      price: parseBRLInput(r.priceText) ?? 0,
      etaDays: Number(r.etaDays) || 0,
    };
    if (r.minText.trim()) rule.minSubtotal = parseBRLInput(r.minText);
    if (r.maxText.trim()) rule.maxSubtotal = parseBRLInput(r.maxText);
    return rule;
  });

  const defaultRule =
    form.defaultPriceText.trim() || form.defaultEta.trim()
      ? { price: parseBRLInput(form.defaultPriceText) ?? 0, etaDays: Number(form.defaultEta) || 0 }
      : null;

  const freeShippingThreshold = form.freeText.trim() ? parseBRLInput(form.freeText) : null;

  return { rules, defaultRule, freeShippingThreshold };
}

const EMPTY_RULE = { region: "", cepRanges: [{ from: "", to: "" }], priceText: "", etaDays: "", minText: "", maxText: "" };

function ShippingPage() {
  const { toastSuccess, toastError } = useFeedback();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    getShippingSettings().then((s) => setForm(toForm(s)));
  }, []);

  if (!form) {
    return <p className={styles.muted}>Carregando…</p>;
  }

  function setRule(i, patch) {
    setForm((f) => ({ ...f, rules: f.rules.map((r, j) => (i === j ? { ...r, ...patch } : r)) }));
  }

  function setRange(ri, xi, patch) {
    setForm((f) => ({
      ...f,
      rules: f.rules.map((r, j) =>
        j === ri ? { ...r, cepRanges: r.cepRanges.map((x, k) => (k === xi ? { ...x, ...patch } : x)) } : r
      ),
    }));
  }

  async function handleSave() {
    const settings = toSettings(form);
    const check = validateShippingSettings(settings);

    if (!check.ok) {
      setErrors(check.issues);
      toastError("Corrija a tabela de frete antes de salvar.");
      return;
    }

    setErrors([]);
    setSaving(true);

    try {
      await updateShippingSettings(settings);
      toastSuccess("Tabela de frete salva.");
    } catch {
      toastError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Frete</h1>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>

      {errors.length > 0 && (
        <div className={styles.errors} role="alert">
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Regras por região</h2>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setForm((f) => ({ ...f, rules: [...f.rules, { ...EMPTY_RULE }] }))}
          >
            Adicionar região
          </Button>
        </div>

        {form.rules.length === 0 && <p className={styles.muted}>Nenhuma região. Adicione ao menos uma.</p>}

        {form.rules.map((rule, i) => (
          <div key={i} className={styles.rule}>
            <div className={styles.ruleTop}>
              <TextField
                size="small"
                label="Região"
                value={rule.region}
                onChange={(e) => setRule(i, { region: e.target.value })}
                placeholder="Sudeste"
              />
              <TextField
                size="small"
                label="Valor do frete"
                value={rule.priceText}
                onChange={(e) => setRule(i, { priceText: e.target.value })}
                placeholder="19,90"
              />
              <TextField
                size="small"
                type="number"
                label="Prazo (dias)"
                value={rule.etaDays}
                onChange={(e) => setRule(i, { etaDays: e.target.value })}
              />
              <IconButton
                aria-label="Remover região"
                onClick={() => setForm((f) => ({ ...f, rules: f.rules.filter((_, j) => j !== i) }))}
              >
                <DeleteOutlineOutlinedIcon />
              </IconButton>
            </div>

            <div className={styles.ranges}>
              <span className={styles.subLabel}>Faixas de CEP</span>
              {rule.cepRanges.map((x, k) => (
                <div key={k} className={styles.range}>
                  <TextField
                    size="small"
                    label="De"
                    value={x.from}
                    onChange={(e) => setRange(i, k, { from: maskCep(e.target.value) })}
                    placeholder="01000-000"
                  />
                  <TextField
                    size="small"
                    label="Até"
                    value={x.to}
                    onChange={(e) => setRange(i, k, { to: maskCep(e.target.value) })}
                    placeholder="39999-999"
                  />
                  <IconButton
                    size="small"
                    aria-label="Remover faixa"
                    onClick={() =>
                      setRule(i, { cepRanges: rule.cepRanges.filter((_, kk) => kk !== k) })
                    }
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
              <Button
                size="small"
                onClick={() => setRule(i, { cepRanges: [...rule.cepRanges, { from: "", to: "" }] })}
              >
                + faixa de CEP
              </Button>
            </div>

            <div className={styles.valueBand}>
              <span className={styles.subLabel}>Faixa de valor do pedido (opcional)</span>
              <TextField
                size="small"
                label="De R$"
                value={rule.minText}
                onChange={(e) => setRule(i, { minText: e.target.value })}
              />
              <TextField
                size="small"
                label="Até R$"
                value={rule.maxText}
                onChange={(e) => setRule(i, { maxText: e.target.value })}
              />
            </div>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Frete padrão (demais regiões)</h2>
        <p className={styles.hint}>
          Aplicado a CEPs não cobertos por nenhuma regra. Vazio = bloquear compra nesses CEPs.
        </p>
        <div className={styles.row}>
          <TextField
            size="small"
            label="Valor do frete"
            value={form.defaultPriceText}
            onChange={(e) => setForm((f) => ({ ...f, defaultPriceText: e.target.value }))}
            placeholder="39,90"
          />
          <TextField
            size="small"
            type="number"
            label="Prazo (dias)"
            value={form.defaultEta}
            onChange={(e) => setForm((f) => ({ ...f, defaultEta: e.target.value }))}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Frete grátis</h2>
        <p className={styles.hint}>Pedidos com subtotal acima deste valor têm frete grátis. Vazio = desligado.</p>
        <TextField
          size="small"
          label="Frete grátis acima de R$"
          value={form.freeText}
          onChange={(e) => setForm((f) => ({ ...f, freeText: e.target.value }))}
          placeholder="199,00"
        />
      </section>
    </div>
  );
}

export default ShippingPage;
