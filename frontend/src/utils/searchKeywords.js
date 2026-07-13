import { normalizeForSearch } from "./slugify";

// Tokens de busca da vitrine (feature 005, R-2). Gera, para cada token de
// nome/SKU/categoria (normalizado: minúsculas, sem acentos), os prefixos de
// comprimento ≥ 3 até o token inteiro — consultados por `array-contains`, o
// que resolve "camis" → "Camiseta". Também guarda o SKU normalizado inteiro
// (ex.: "nike-001") para busca por SKU exato.
//
// O MESMO módulo normaliza o termo de busca (normalizeQueryTerm), garantindo
// simetria entre o write do admin, o backfill e a query.

const MIN_PREFIX = 3;

function tokenize(text) {
  return normalizeForSearch(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function addPrefixes(set, token) {
  for (let len = MIN_PREFIX; len <= token.length; len++) {
    set.add(token.slice(0, len));
  }
}

export function buildSearchKeywords(name, sku, categoryName) {
  const keywords = new Set();

  for (const token of tokenize(name)) {
    addPrefixes(keywords, token);
  }

  for (const token of tokenize(categoryName)) {
    addPrefixes(keywords, token);
  }

  // SKU: prefixos dos tokens + o SKU normalizado inteiro (busca exata).
  const skuNorm = normalizeForSearch(sku);

  if (skuNorm) {
    keywords.add(skuNorm);

    for (const token of tokenize(sku)) {
      addPrefixes(keywords, token);
    }
  }

  return [...keywords].sort();
}

// Termo da query → um token normalizado para o `array-contains` (primeira
// palavra; multi-palavra casa pela primeira — limitação documentada de
// array-contains).
export function normalizeQueryTerm(term) {
  const normalized = normalizeForSearch(term).trim();

  if (!normalized) {
    return "";
  }

  return normalized.split(/\s+/)[0];
}
