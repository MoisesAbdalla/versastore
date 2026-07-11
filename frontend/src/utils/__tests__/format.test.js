import { describe, it, expect } from "vitest";

import { formatBRL, formatDate, formatDateTime, formatPct } from "../format";

// Intl usa non-breaking space entre "R$" e o valor — normalizamos p/ comparar.
function normalize(text) {
  return text.replace(/ /g, " ");
}

describe("formatBRL", () => {
  it("formata centavos como moeda brasileira", () => {
    expect(normalize(formatBRL(19990))).toBe("R$ 199,90");
    expect(normalize(formatBRL(100))).toBe("R$ 1,00");
    expect(normalize(formatBRL(5))).toBe("R$ 0,05");
  });

  it("trata nulo/indefinido como zero", () => {
    expect(normalize(formatBRL(null))).toBe("R$ 0,00");
    expect(normalize(formatBRL(undefined))).toBe("R$ 0,00");
  });
});

describe("formatDate", () => {
  it("formata Date no padrão brasileiro", () => {
    expect(formatDate(new Date("2026-07-11T15:00:00-03:00"))).toBe("11/07/2026");
  });

  it("aceita Timestamp do Firestore (objeto com toDate)", () => {
    const timestamp = { toDate: () => new Date("2026-01-05T12:00:00-03:00") };

    expect(formatDate(timestamp)).toBe("05/01/2026");
  });

  it("retorna vazio para nulo", () => {
    expect(formatDate(null)).toBe("");
  });
});

describe("formatDateTime", () => {
  it("inclui hora no fuso de Brasília", () => {
    const formatted = formatDateTime(new Date("2026-07-11T15:30:00-03:00"));

    expect(formatted).toContain("11/07/2026");
    expect(formatted).toContain("15:30");
  });
});

describe("formatPct", () => {
  it("prefixa sinal de positivo e arredonda", () => {
    expect(formatPct(12.4)).toBe("+12%");
    expect(formatPct(-8.6)).toBe("-9%");
    expect(formatPct(0)).toBe("0%");
  });

  it("retorna travessão quando não há comparação possível", () => {
    expect(formatPct(null)).toBe("—");
    expect(formatPct(Number.NaN)).toBe("—");
  });
});
