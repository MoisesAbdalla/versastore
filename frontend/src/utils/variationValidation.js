// Regras de consistência de variações por atributo (feature 008). Fonte ÚNICA
// reutilizada pelo editor do admin, pelo productService e pelo backfill — para
// que a mesma definição de "inconsistente" valha no runtime e na migração.
//
// Modelo: product.attributes = [{ name, values: string[] }] (ordenado); cada
// variação tem attributes: { [name]: value } escolhendo um valor por atributo.

function nonEmpty(value) {
  return typeof value === "string" ? value.trim() !== "" : value != null && value !== "";
}

// Combinação canônica (na ordem dos atributos) para detectar duplicidade.
function comboKey(variation, names) {
  return names.map((name) => String(variation.attributes?.[name] ?? "")).join(" / ");
}

// Valida a consistência das variações de um produto.
// Retorna { ok, issues } — issues em pt-BR, prontas para exibição no admin.
export function validateVariations(product) {
  const attributes = product.attributes || [];
  const variations = product.variations || [];
  const names = attributes.map((attr) => attr.name);
  const issues = [];

  // Produto simples (sem variações): só checa atributos malformados, se houver.
  if (variations.length === 0) {
    if (attributes.some((attr) => !nonEmpty(attr.name))) {
      issues.push("Há atributo sem nome.");
    }

    return { ok: issues.length === 0, issues };
  }

  // Com variações, é obrigatório declarar atributos.
  if (names.length === 0) {
    return { ok: false, issues: ["As variações não têm atributos declarados."] };
  }

  // Atributos: nome preenchido, sem duplicata, com ao menos um valor.
  const nameSet = new Set();

  for (const attr of attributes) {
    if (!nonEmpty(attr.name)) {
      issues.push("Há atributo sem nome.");
    } else if (nameSet.has(attr.name)) {
      issues.push(`Atributo "${attr.name}" está duplicado.`);
    } else {
      nameSet.add(attr.name);
    }

    if (!(attr.values || []).some(nonEmpty)) {
      issues.push(`O atributo "${attr.name}" não tem valores.`);
    }
  }

  const allowedByName = Object.fromEntries(
    attributes.map((attr) => [attr.name, new Set((attr.values || []).filter(nonEmpty))])
  );

  // Cada variação: um valor não vazio por atributo, dentro da lista permitida,
  // sem chaves extras que não pertençam ao produto.
  variations.forEach((variation, index) => {
    const vAttrs = variation.attributes || {};
    const label = `Variação ${index + 1}`;

    for (const name of names) {
      const value = vAttrs[name];

      if (!nonEmpty(value)) {
        issues.push(`${label}: sem valor de "${name}".`);
      } else if (allowedByName[name]?.size && !allowedByName[name].has(value)) {
        issues.push(`${label}: "${value}" não é um valor válido de "${name}".`);
      }
    }

    for (const key of Object.keys(vAttrs)) {
      if (!nameSet.has(key) && nonEmpty(vAttrs[key])) {
        issues.push(`${label}: atributo "${key}" não faz parte do produto.`);
      }
    }
  });

  // Combinação de valores única entre as variações.
  const seen = new Set();

  for (const variation of variations) {
    const key = comboKey(variation, names);

    if (seen.has(key)) {
      issues.push(`Combinação "${key}" está duplicada.`);
    } else {
      seen.add(key);
    }
  }

  const unique = [...new Set(issues)];

  return { ok: unique.length === 0, issues: unique };
}

// Deriva os atributos (com valores ordenados) a partir das variações legadas
// — usado pela migração. Conjunto de atributos = chaves preenchidas em TODAS as
// variações; valores por atributo = distintos na ordem de primeira aparição.
// Marca `inconsistent` quando as variações discordam do conjunto (NÃO inventa
// valores nem altera variações).
export function deriveAttributesFromVariations(variations) {
  const list = variations || [];

  if (list.length === 0) {
    return { attributes: [], inconsistent: false, issues: [] };
  }

  // Chaves preenchidas (valor não vazio) em cada variação.
  const filledSets = list.map((variation) => {
    const set = new Set();

    for (const [key, value] of Object.entries(variation.attributes || {})) {
      if (nonEmpty(value)) {
        set.add(key);
      }
    }

    return set;
  });

  const union = new Set();

  for (const set of filledSets) {
    for (const key of set) {
      union.add(key);
    }
  }

  const intersection = [...union].filter((key) => filledSets.every((set) => set.has(key)));

  // Ordem dos atributos = primeira aparição nas variações.
  const orderedNames = [];

  for (const variation of list) {
    for (const key of Object.keys(variation.attributes || {})) {
      if (intersection.includes(key) && nonEmpty(variation.attributes[key]) && !orderedNames.includes(key)) {
        orderedNames.push(key);
      }
    }
  }

  const attributes = orderedNames.map((name) => {
    const values = [];

    for (const variation of list) {
      const value = variation.attributes?.[name];

      if (nonEmpty(value) && !values.includes(value)) {
        values.push(value);
      }
    }

    return { name, values };
  });

  const inconsistent = union.size !== intersection.length;
  const issues = inconsistent
    ? [...union]
        .filter((key) => !intersection.includes(key))
        .map((key) => `O atributo "${key}" não está preenchido em todas as variações.`)
    : [];

  return { attributes, inconsistent, issues };
}

// Detecta grupos de variações que colapsariam na MESMA combinação após uma
// mudança no conjunto de atributos (ex.: remover "Cor"). Usado pelo editor para
// exigir resolução explícita do lojista (FR-008a) antes de salvar.
export function detectMergeConflicts(prevVariations, nextAttributeNames) {
  const names = nextAttributeNames || [];
  const groups = new Map();

  for (const variation of prevVariations || []) {
    const key = names.map((name) => String(variation.attributes?.[name] ?? "")).join(" / ");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(variation.id);
  }

  const conflicts = [];

  for (const [combination, variationIds] of groups.entries()) {
    if (variationIds.length > 1) {
      conflicts.push({ combination, variationIds });
    }
  }

  return conflicts;
}
