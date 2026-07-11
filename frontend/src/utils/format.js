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

export function formatPct(delta) {
  if (delta == null || Number.isNaN(delta)) {
    return "—";
  }

  const rounded = Math.round(delta);
  const sign = rounded > 0 ? "+" : "";

  return `${sign}${rounded}%`;
}
