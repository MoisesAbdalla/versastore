const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

function toDate(value) {
  if (value == null) {
    return null;
  }

  // Timestamp do Firestore expõe toDate(); Date e number passam direto.
  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  return value instanceof Date ? value : new Date(value);
}

export function formatBRL(cents) {
  if (cents == null || Number.isNaN(cents)) {
    return brlFormatter.format(0);
  }

  return brlFormatter.format(cents / 100);
}

export function formatDate(value) {
  const date = toDate(value);

  return date ? dateFormatter.format(date) : "";
}

export function formatDateTime(value) {
  const date = toDate(value);

  return date ? dateTimeFormatter.format(date) : "";
}

// Converte entrada digitada ("199,90", "1.234,56", "199.90", "199") em centavos.
export function parseBRLInput(text) {
  if (text === null || text === undefined || String(text).trim() === "") {
    return null;
  }

  let clean = String(text).replace(/[R$\s]/g, "");

  if (clean.includes(",")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  }

  const value = Number(clean);

  return Number.isNaN(value) ? null : Math.round(value * 100);
}

// Centavos → texto editável no formulário ("19990" → "199,90").
export function centsToInput(cents) {
  if (cents === null || cents === undefined) {
    return "";
  }

  return (cents / 100).toFixed(2).replace(".", ",");
}

// Máscara progressiva para digitação de data brasileira: "11072026" → "11/07/2026".
export function maskDateInput(text) {
  const digits = String(text || "").replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);

  return parts.join("/");
}

// "dd/mm/aaaa" → Date (ou null se inválida/incompleta). endOfDay para datas de
// fim de período (promoção termina no fim do dia).
export function parseDateInput(text, { endOfDay = false } = {}) {
  const match = String(text || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59)
    : new Date(year, month - 1, day);

  // Rejeita datas impossíveis (ex.: 31/02) — o Date "rolaria" para o mês seguinte.
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null;
  }

  return date;
}

export function formatPct(delta) {
  if (delta == null || Number.isNaN(delta)) {
    return "—";
  }

  const rounded = Math.round(delta);
  const sign = rounded > 0 ? "+" : "";

  return `${sign}${rounded}%`;
}
