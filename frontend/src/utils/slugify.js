export function slugify(name) {
  if (!name) {
    return "";
  }

  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Mesma normalização usada nos campos *Lower de busca por prefixo (research R-5).
export function normalizeForSearch(text) {
  if (!text) {
    return "";
  }

  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
