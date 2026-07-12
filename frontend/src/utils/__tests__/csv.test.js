import { describe, it, expect } from "vitest";

import { buildCsv, CSV_MAX_ROWS } from "../csv";

describe("buildCsv", () => {
  it("inicia com BOM UTF-8 (Excel pt-BR) e usa separador ponto e vírgula", () => {
    const csv = buildCsv(["Nome", "Preço"], [["Tênis", "199,90"]]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe("Nome;Preço\r\nTênis;199,90");
  });

  it("escapa células com ponto e vírgula, aspas e quebra de linha", () => {
    const csv = buildCsv(["Campo"], [['valor; com "aspas"'], ["linha\nquebrada"]]);
    const lines = csv.slice(1).split("\r\n");

    expect(lines[1]).toBe('"valor; com ""aspas"""');
    expect(lines[2]).toBe('"linha\nquebrada"');
  });

  it("trata nulos como célula vazia", () => {
    const csv = buildCsv(["A", "B"], [[null, undefined]]);

    expect(csv.slice(1).split("\r\n")[1]).toBe(";");
  });

  it("aplica o teto de linhas (leituras com escopo)", () => {
    const rows = Array.from({ length: CSV_MAX_ROWS + 100 }, (_, i) => [String(i)]);
    const csv = buildCsv(["N"], rows);

    // cabeçalho + CSV_MAX_ROWS linhas
    expect(csv.split("\r\n")).toHaveLength(CSV_MAX_ROWS + 1);
  });
});
