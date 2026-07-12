import { describe, it, expect } from "vitest";

import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatPct,
  parseBRLInput,
  centsToInput,
  maskDateInput,
  parseDateInput,
} from "../format";

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

describe("parseBRLInput", () => {
  it("converte entrada brasileira em centavos", () => {
    expect(parseBRLInput("199,90")).toBe(19990);
    expect(parseBRLInput("1.234,56")).toBe(123456);
    expect(parseBRLInput("R$ 49,90")).toBe(4990);
  });

  it("aceita ponto decimal e inteiro", () => {
    expect(parseBRLInput("199.90")).toBe(19990);
    expect(parseBRLInput("199")).toBe(19900);
  });

  it("retorna null para vazio ou inválido", () => {
    expect(parseBRLInput("")).toBe(null);
    expect(parseBRLInput("abc")).toBe(null);
    expect(parseBRLInput(null)).toBe(null);
  });
});

describe("centsToInput", () => {
  it("converte centavos em texto editável", () => {
    expect(centsToInput(19990)).toBe("199,90");
    expect(centsToInput(500)).toBe("5,00");
  });

  it("retorna vazio para nulo", () => {
    expect(centsToInput(null)).toBe("");
  });
});

describe("maskDateInput", () => {
  it("aplica a máscara dd/mm/aaaa progressivamente", () => {
    expect(maskDateInput("1")).toBe("1");
    expect(maskDateInput("1107")).toBe("11/07");
    expect(maskDateInput("11072026")).toBe("11/07/2026");
  });

  it("ignora não-dígitos e limita a 8 dígitos", () => {
    expect(maskDateInput("11/07/2026extra")).toBe("11/07/2026");
    expect(maskDateInput("abc")).toBe("");
  });
});

describe("parseDateInput", () => {
  it("converte dd/mm/aaaa em Date", () => {
    const date = parseDateInput("11/07/2026");

    expect(date.getDate()).toBe(11);
    expect(date.getMonth()).toBe(6);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getHours()).toBe(0);
  });

  it("endOfDay marca o fim do dia (fim de promoção)", () => {
    const date = parseDateInput("11/07/2026", { endOfDay: true });

    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
  });

  it("rejeita datas impossíveis e formatos incompletos", () => {
    expect(parseDateInput("31/02/2026")).toBe(null);
    expect(parseDateInput("11/13/2026")).toBe(null);
    expect(parseDateInput("11/07/26")).toBe(null);
    expect(parseDateInput("")).toBe(null);
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
