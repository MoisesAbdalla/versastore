import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
} from "../../../services/couponService";
import { couponStatus } from "../../../utils/coupon";
import { COUPON_TYPE, COUPON_TYPE_LABELS, COUPON_STATUS_LABELS } from "../../../constants/coupon";
import { useFeedback } from "../../../contexts/FeedbackContext";
import {
  parseBRLInput,
  centsToInput,
  formatBRL,
  maskDateInput,
  parseDateInput,
  formatDate,
} from "../../../utils/format";
import styles from "./styles.module.css";

const EMPTY_FORM = {
  code: "",
  type: COUPON_TYPE.PERCENTUAL,
  valueText: "",
  minText: "",
  startText: "",
  endText: "",
  maxUsesText: "",
  active: true,
};

// Cupom (doc) → estado do formulário (dinheiro/percentual em texto).
function toForm(coupon) {
  return {
    code: coupon.code,
    type: coupon.type,
    valueText:
      coupon.type === COUPON_TYPE.FIXO
        ? centsToInput(coupon.value)
        : coupon.type === COUPON_TYPE.PERCENTUAL
          ? String(coupon.value ?? "")
          : "",
    minText: coupon.minSubtotal != null ? centsToInput(coupon.minSubtotal) : "",
    startText: coupon.startAt ? formatDate(coupon.startAt) : "",
    endText: coupon.endAt ? formatDate(coupon.endAt) : "",
    maxUsesText: coupon.maxUses != null ? String(coupon.maxUses) : "",
    active: coupon.active !== false,
  };
}

// Estado do formulário → payload do service (valores convertidos).
function toPayload(form) {
  const value =
    form.type === COUPON_TYPE.FIXO
      ? parseBRLInput(form.valueText)
      : form.type === COUPON_TYPE.PERCENTUAL
        ? Number(form.valueText) || null
        : null;

  return {
    code: form.code,
    type: form.type,
    value,
    minSubtotal: form.minText.trim() ? parseBRLInput(form.minText) : null,
    startAt: parseDateInput(form.startText),
    endAt: parseDateInput(form.endText, { endOfDay: true }),
    maxUses: form.maxUsesText.trim() ? Number(form.maxUsesText) : null,
    active: form.active,
  };
}

function valueLabel(coupon) {
  if (coupon.type === COUPON_TYPE.FIXO) return formatBRL(coupon.value);
  if (coupon.type === COUPON_TYPE.PERCENTUAL) return `${coupon.value}%`;
  return "—";
}

function CouponsPage() {
  const { toastSuccess, toastError } = useFeedback();
  const [coupons, setCoupons] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | código existente
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function reload() {
    setCoupons(await listCoupons());
  }

  useEffect(() => {
    reload().catch(() => toastError("Não foi possível carregar os cupons."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditing("new");
  }

  function openEdit(coupon) {
    setForm(toForm(coupon));
    setErrors({});
    setEditing(coupon.code);
  }

  function closeForm() {
    setEditing(null);
    setErrors({});
  }

  async function handleSave() {
    const payload = toPayload(form);
    setSaving(true);

    try {
      if (editing === "new") {
        await createCoupon(payload);
        toastSuccess("Cupom criado.");
      } else {
        // Código é imutável: não vai no update.
        const { code: _code, ...changes } = payload;
        await updateCoupon(editing, changes);
        toastSuccess("Cupom atualizado.");
      }

      await reload();
      closeForm();
    } catch (error) {
      if (error.code === "codigo-duplicado") {
        setErrors({ code: "Já existe um cupom com esse código." });
      } else if (error.code === "invalido") {
        // Revalida localmente para mostrar os erros campo a campo.
        setErrors(validateForm(payload));
      } else {
        toastError("Não foi possível salvar o cupom.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(coupon) {
    try {
      await toggleCouponActive(coupon.code, !coupon.active);
      await reload();
    } catch {
      toastError("Não foi possível alterar o cupom.");
    }
  }

  async function handleDelete(coupon) {
    if (!window.confirm(`Remover o cupom ${coupon.code}?`)) return;

    try {
      await deleteCoupon(coupon.code);
      await reload();
      toastSuccess("Cupom removido.");
    } catch {
      toastError("Não foi possível remover o cupom.");
    }
  }

  if (coupons === null) {
    return <p className={styles.muted}>Carregando…</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cupons</h1>
        {editing === null && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            Novo cupom
          </Button>
        )}
      </div>

      {editing !== null && (
        <CouponForm
          form={form}
          setForm={setForm}
          errors={errors}
          saving={saving}
          isNew={editing === "new"}
          onSave={handleSave}
          onCancel={closeForm}
        />
      )}

      {coupons.length === 0 ? (
        <p className={styles.muted}>Nenhum cupom cadastrado.</p>
      ) : (
        <div className={styles.list}>
          {coupons.map((coupon) => {
            const status = couponStatus(coupon);
            return (
              <div key={coupon.code} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.code}>{coupon.code}</span>
                  <span className={styles.type}>{COUPON_TYPE_LABELS[coupon.type]}</span>
                  <span className={styles.value}>{valueLabel(coupon)}</span>
                </div>
                <div className={styles.rowMeta}>
                  <span className={styles.status} data-status={status}>
                    {COUPON_STATUS_LABELS[status]}
                  </span>
                  <span className={styles.uses}>
                    {coupon.usedCount || 0}
                    {coupon.maxUses != null ? `/${coupon.maxUses}` : ""} usos
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Switch
                    size="small"
                    checked={coupon.active !== false}
                    onChange={() => handleToggle(coupon)}
                    inputProps={{ "aria-label": `Ativar ${coupon.code}` }}
                  />
                  <IconButton size="small" aria-label="Editar" onClick={() => openEdit(coupon)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Remover" onClick={() => handleDelete(coupon)}>
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Validação local espelhando o util (só para exibir erros campo a campo).
function validateForm(payload) {
  const errors = {};
  if (!payload.code || !payload.code.trim()) errors.code = "Informe o código.";
  if (payload.type !== COUPON_TYPE.FRETE_GRATIS) {
    if (payload.value == null || payload.value <= 0) errors.value = "Informe um valor maior que zero.";
    else if (payload.type === COUPON_TYPE.PERCENTUAL && payload.value > 100)
      errors.value = "O percentual deve ser no máximo 100.";
  }
  if (payload.startAt && payload.endAt && payload.endAt < payload.startAt)
    errors.dates = "A data final deve ser igual ou depois da inicial.";
  if (payload.maxUses != null && payload.maxUses < 0) errors.maxUses = "O limite não pode ser negativo.";
  return errors;
}

function CouponForm({ form, setForm, errors, saving, isNew, onSave, onCancel }) {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isFreeShipping = form.type === COUPON_TYPE.FRETE_GRATIS;

  return (
    <section className={styles.form}>
      <div className={styles.formGrid}>
        <TextField
          size="small"
          label="Código"
          value={form.code}
          onChange={(e) => set({ code: e.target.value.toUpperCase() })}
          disabled={!isNew}
          error={Boolean(errors.code)}
          helperText={errors.code}
          placeholder="BEMVINDO10"
        />
        <TextField
          size="small"
          select
          label="Tipo"
          value={form.type}
          onChange={(e) => set({ type: e.target.value })}
        >
          {Object.values(COUPON_TYPE).map((t) => (
            <MenuItem key={t} value={t}>
              {COUPON_TYPE_LABELS[t]}
            </MenuItem>
          ))}
        </TextField>
        {!isFreeShipping && (
          <TextField
            size="small"
            label={form.type === COUPON_TYPE.PERCENTUAL ? "Desconto (%)" : "Desconto (R$)"}
            value={form.valueText}
            onChange={(e) => set({ valueText: e.target.value })}
            error={Boolean(errors.value)}
            helperText={errors.value}
            placeholder={form.type === COUPON_TYPE.PERCENTUAL ? "10" : "20,00"}
          />
        )}
        <TextField
          size="small"
          label="Pedido mínimo (R$)"
          value={form.minText}
          onChange={(e) => set({ minText: e.target.value })}
          placeholder="opcional"
        />
        <TextField
          size="small"
          label="Válido de"
          value={form.startText}
          onChange={(e) => set({ startText: maskDateInput(e.target.value) })}
          error={Boolean(errors.dates)}
          placeholder="dd/mm/aaaa"
        />
        <TextField
          size="small"
          label="Válido até"
          value={form.endText}
          onChange={(e) => set({ endText: maskDateInput(e.target.value) })}
          error={Boolean(errors.dates)}
          helperText={errors.dates}
          placeholder="dd/mm/aaaa"
        />
        <TextField
          size="small"
          type="number"
          label="Limite de uso total"
          value={form.maxUsesText}
          onChange={(e) => set({ maxUsesText: e.target.value })}
          error={Boolean(errors.maxUses)}
          helperText={errors.maxUses}
          placeholder="opcional"
        />
        <FormControlLabel
          control={<Switch checked={form.active} onChange={(e) => set({ active: e.target.checked })} />}
          label="Ativo"
        />
      </div>
      <div className={styles.formActions}>
        <Button onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </section>
  );
}

export default CouponsPage;
