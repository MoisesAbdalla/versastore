import { describe, it, expect } from "vitest";

import { sanitizeHtml } from "../sanitize";

describe("sanitizeHtml", () => {
  it("preserva formatação básica permitida", () => {
    const input = "<p>Texto <b>negrito</b> e <i>itálico</i></p><ul><li>item</li></ul>";

    expect(sanitizeHtml(input)).toBe(input);
  });

  it("remove script preservando nada executável", () => {
    const output = sanitizeHtml('<p>ok</p><script>alert("xss")</script>');

    expect(output).not.toContain("<script");
    expect(output).toContain("<p>ok</p>");
  });

  it("neutraliza handlers de evento em tags permitidas", () => {
    const output = sanitizeHtml('<p onclick="alert(1)" style="color:red">texto</p>');

    expect(output).toBe("<p>texto</p>");
  });

  it("descarta img com onerror mantendo texto ao redor", () => {
    const output = sanitizeHtml('antes <img src="x" onerror="alert(1)"> depois');

    expect(output).not.toContain("<img");
    expect(output).toContain("antes");
    expect(output).toContain("depois");
  });

  it("remove âncoras javascript: preservando o texto do link", () => {
    const output = sanitizeHtml('<a href="javascript:alert(1)">clique</a>');

    expect(output).not.toContain("<a");
    expect(output).toContain("clique");
  });

  it("desembrulha tags aninhadas proibidas sem perder conteúdo permitido", () => {
    const output = sanitizeHtml("<div><table><tr><td><b>texto</b></td></tr></table></div>");

    expect(output).not.toContain("<table");
    expect(output).toContain("<b>texto</b>");
  });

  it("retorna vazio para entrada vazia", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null)).toBe("");
  });
});
