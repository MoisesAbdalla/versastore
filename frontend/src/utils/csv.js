// Exportação CSV 100% no cliente (research R-9): BOM UTF-8 (Excel pt-BR abre
// acentos corretos), separador ";" (padrão do Excel pt-BR), aspas escapadas e
// teto de segurança de linhas (leituras com escopo — constituição IV).

export const CSV_MAX_ROWS = 5000;

function escapeCell(value) {
  const text = value === null || value === undefined ? "" : String(value);

  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(headers, rows) {
  const lines = [
    headers.map(escapeCell).join(";"),
    ...rows.slice(0, CSV_MAX_ROWS).map((row) => row.map(escapeCell).join(";")),
  ];

  // A string abaixo comeca com U+FEFF (BOM) - caractere invisivel INTENCIONAL
  // (Excel pt-BR precisa dele p/ abrir UTF-8 corretamente). Nao remover.
  return "﻿" + lines.join("\r\n");
}

export function exportCsv({ headers, rows, filename }) {
  const blob = new Blob([buildCsv(headers, rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return Math.min(rows.length, CSV_MAX_ROWS);
}
