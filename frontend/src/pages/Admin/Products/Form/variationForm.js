// Transformações puras entre o form do admin e o modelo de produto (feature
// 008). Isoladas aqui para serem testáveis sem montar o formulário MUI.

import { parseBRLInput, centsToInput } from "../../../../utils/format";
import { deriveAttributesFromVariations, detectMergeConflicts } from "../../../../utils/variationValidation";

// Atributos do form: do produto (novo modelo) ou DERIVADOS das variações
// (produto legado, ainda sem `attributes` declarado).
export function attributesFromProduct(product) {
  if (Array.isArray(product.attributes) && product.attributes.length) {
    return product.attributes.map((attr) => ({ name: attr.name, values: [...(attr.values || [])] }));
  }

  return deriveAttributesFromVariations(product.variations || []).attributes;
}

// Variação armazenada → linha do form (valores num mapa por nome de atributo).
export function variationsToForm(variations) {
  return (variations || []).map((variation) => ({
    id: variation.id,
    values: { ...(variation.attributes || {}) },
    sku: variation.sku || "",
    priceText: centsToInput(variation.price),
    stock: variation.stock != null ? String(variation.stock) : "",
  }));
}

// Linha do form → variação do produto. **Reusa o id existente** (R-2: id
// estável) e chaveia os valores exatamente pelos atributos declarados.
export function formVariationsToProduct(formVariations, attributeNames) {
  return (formVariations || []).map((row) => ({
    id: row.id,
    attributes: Object.fromEntries(
      attributeNames.map((name) => [name, (row.values?.[name] || "").trim()])
    ),
    sku: (row.sku || "").trim(),
    price: parseBRLInput(row.priceText),
    stock: Number(row.stock) || 0,
  }));
}

let idCounter = 0;

// Id novo só para combinação NOVA (nunca regenera id de variação existente).
export function newVariationId() {
  idCounter += 1;

  return `var-${Date.now()}-${idCounter}`;
}

// Normaliza um valor de atributo digitado, para a loja não exibir caixa
// inconsistente ("preto" vs "AZUL" vs "gg"). Siglas curtas e alfanuméricos em
// CAIXA ALTA (P, GG, 110V); palavras em Capitalizada (Preta, Azul).
export function normalizeAttributeValue(raw) {
  const clean = String(raw || "").trim().replace(/\s+/g, " ");

  if (!clean) {
    return "";
  }

  if (clean.length <= 3 || /\d/.test(clean)) {
    return clean.toUpperCase();
  }

  return clean[0].toUpperCase() + clean.slice(1).toLowerCase();
}

// Produto cartesiano dos valores declarados: gera as combinações que ainda
// não existem (linhas novas com id novo); as existentes são preservadas
// intactas (id estável). O lojista só preenche SKU/estoque/preço e apaga as
// combinações que não existem.
export function generateCombinations(attributes, existingRows) {
  const axes = (attributes || [])
    .map((attr) => ({ name: (attr.name || "").trim(), values: (attr.values || []).filter(Boolean) }))
    .filter((attr) => attr.name && attr.values.length);

  if (axes.length === 0) {
    return existingRows || [];
  }

  let combos = [{}];

  for (const axis of axes) {
    combos = combos.flatMap((partial) =>
      axis.values.map((value) => ({ ...partial, [axis.name]: value }))
    );
  }

  const names = axes.map((axis) => axis.name);
  const keyOf = (values) => names.map((name) => String(values?.[name] ?? "")).join(" / ");
  const existingKeys = new Set((existingRows || []).map((row) => keyOf(row.values)));

  const added = combos
    .filter((values) => !existingKeys.has(keyOf(values)))
    .map((values) => ({ id: newVariationId(), values, sku: "", priceText: "", stock: "" }));

  return [...(existingRows || []), ...added];
}

// Renomear um atributo remapeia a chave correspondente nas linhas de variação
// — sem isso, os valores escolhidos ficariam órfãos sob o nome antigo.
export function remapAttributeName(formVariations, oldName, newName) {
  const from = (oldName || "").trim();
  const to = (newName || "").trim();

  if (!from || from === to) {
    return formVariations || [];
  }

  return (formVariations || []).map((row) => {
    if (!row.values || !(from in row.values)) {
      return row;
    }

    const values = { ...row.values };

    if (to) {
      values[to] = values[from];
    }

    delete values[from];

    return { ...row, values };
  });
}

// Conflitos de fusão ao remover um atributo: grupos de variações que colapsam
// na mesma combinação sob o conjunto de atributos restante.
export function conflictsForRemoval(formVariations, nextNames) {
  const asVariations = (formVariations || []).map((row) => ({ id: row.id, attributes: row.values }));

  return detectMergeConflicts(asVariations, nextNames);
}

// Um valor está em uso se alguma variação o utiliza naquele atributo.
export function valueInUse(formVariations, attrName, value) {
  return (formVariations || []).some((row) => row.values?.[attrName] === value);
}

// Aplica a remoção de um atributo resolvendo os grupos que colapsam.
// `resolutions`: { [combination]: { mode: "keep" | "sum", keepId } } — sem
// resolução para um grupo, mantém a primeira variação (default do modal).
export function applyAttributeRemoval(formVariations, attrName, nextNames, resolutions = {}) {
  const stripped = (formVariations || []).map((row) => {
    const values = { ...row.values };
    delete values[attrName];

    return { ...row, values };
  });

  const groups = new Map();

  for (const row of stripped) {
    const key = nextNames.map((name) => String(row.values?.[name] ?? "")).join(" / ");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row);
  }

  const result = [];

  for (const [key, group] of groups.entries()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const resolution = resolutions[key] || { mode: "keep", keepId: group[0].id };
    const survivor = group.find((row) => row.id === resolution.keepId) || group[0];

    if (resolution.mode === "sum") {
      const total = group.reduce((sum, row) => sum + (Number(row.stock) || 0), 0);
      result.push({ ...survivor, stock: String(total) });
    } else {
      result.push(survivor);
    }
  }

  return result;
}
