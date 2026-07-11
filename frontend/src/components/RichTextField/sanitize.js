// Sanitização por allowlist do HTML da descrição (research R-11): apenas
// formatação básica sobrevive; qualquer atributo é removido (neutraliza XSS
// como onerror/onclick, href javascript:, etc.). Aplicada na gravação E na
// renderização — nunca confiar em HTML armazenado.
const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "UL", "OL", "LI", "P", "BR", "DIV"]);

export function sanitizeHtml(html) {
  if (!html) {
    return "";
  }

  const template = document.createElement("template");
  template.innerHTML = String(html);

  sanitizeNode(template.content);

  return template.innerHTML;
}

function sanitizeNode(node) {
  const children = [...node.childNodes];

  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE || !ALLOWED_TAGS.has(child.tagName)) {
      // Tag proibida (script, img, iframe, a...): descarta a tag, preserva o
      // texto interno já sanitizado.
      sanitizeNode(child);

      while (child.firstChild) {
        node.insertBefore(child.firstChild, child);
      }

      node.removeChild(child);
      continue;
    }

    // Tag permitida: remove todos os atributos e desce recursivamente.
    for (const attr of [...child.attributes]) {
      child.removeAttribute(attr.name);
    }

    sanitizeNode(child);
  }
}
