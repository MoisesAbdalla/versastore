// Cálculo de frete por TABELA (feature 011 / M5a). Regra pura, reutilizada pelo
// provedor de frete (checkout) e pela validação do editor no admin. Sem peso
// (decisão do clarify) — só região (faixa de CEP) + faixa de valor do pedido.
//
// Config (settings/shipping):
//   { rules: [{ region, cepRanges:[{from,to}], price, etaDays, minSubtotal?, maxSubtotal? }],
//     defaultRule: { price, etaDays } | null,
//     freeShippingThreshold: number | null }
// Valores em centavos; CEP em dígitos (8).

export function cepToNumber(cep) {
  return Number(String(cep || "").replace(/\D/g, ""));
}

function inRange(value, from, to) {
  return value >= from && value <= to;
}

function ruleMatchesCep(rule, cepNum) {
  return (rule.cepRanges || []).some((r) => inRange(cepNum, cepToNumber(r.from), cepToNumber(r.to)));
}

function ruleMatchesValue(rule, subtotal) {
  if (rule.minSubtotal != null && subtotal < rule.minSubtotal) return false;
  if (rule.maxSubtotal != null && subtotal > rule.maxSubtotal) return false;
  return true;
}

// Primeira regra (ordem da lista) cujo CEP e faixa de valor casam.
export function matchRule(settings, { cep, subtotal }) {
  const cepNum = cepToNumber(cep);

  return (
    (settings?.rules || []).find(
      (rule) => ruleMatchesCep(rule, cepNum) && ruleMatchesValue(rule, subtotal)
    ) || null
  );
}

// Resultado do cálculo: { price, etaDays, method, free } OU { error }.
// Ordem: frete grátis (subtotal ≥ limite) → regra específica → defaultRule →
// erro (sem_regra). Config totalmente vazia → sem_config.
export function computeShipping(settings, { cep, subtotal }) {
  const hasConfig =
    settings &&
    ((settings.rules && settings.rules.length) ||
      settings.defaultRule ||
      settings.freeShippingThreshold != null);

  if (!hasConfig) {
    return { error: "sem_config" };
  }

  const threshold = settings.freeShippingThreshold;

  if (threshold != null && threshold > 0 && subtotal >= threshold) {
    return { price: 0, etaDays: null, method: "Frete grátis", free: true };
  }

  const rule = matchRule(settings, { cep, subtotal });

  if (rule) {
    return { price: rule.price, etaDays: rule.etaDays, method: rule.region, free: false };
  }

  if (settings.defaultRule) {
    return {
      price: settings.defaultRule.price,
      etaDays: settings.defaultRule.etaDays,
      method: "Demais regiões",
      free: false,
    };
  }

  return { error: "sem_regra" };
}

// Validação da tabela no admin (feature 011, FR-004). Retorna { ok, issues }.
export function validateShippingSettings(settings) {
  const issues = [];
  const rules = settings?.rules || [];
  const ranges = []; // p/ detectar sobreposição entre regras

  rules.forEach((rule, i) => {
    const label = rule.region?.trim() ? `"${rule.region.trim()}"` : `Regra ${i + 1}`;

    if (!rule.region || !rule.region.trim()) {
      issues.push(`Regra ${i + 1}: informe o nome da região.`);
    }

    if (rule.price == null || rule.price < 0) {
      issues.push(`${label}: valor do frete inválido.`);
    }

    if (rule.etaDays == null || rule.etaDays < 0) {
      issues.push(`${label}: prazo inválido.`);
    }

    if (!(rule.cepRanges || []).length) {
      issues.push(`${label}: adicione ao menos uma faixa de CEP.`);
    }

    for (const r of rule.cepRanges || []) {
      const from = cepToNumber(r.from);
      const to = cepToNumber(r.to);

      if (String(r.from || "").replace(/\D/g, "").length !== 8 || String(r.to || "").replace(/\D/g, "").length !== 8) {
        issues.push(`${label}: faixa de CEP deve ter 8 dígitos (de e até).`);
      } else if (from > to) {
        issues.push(`${label}: a faixa de CEP tem início maior que o fim.`);
      } else {
        // Sobreposição com faixas já vistas.
        if (ranges.some((x) => from <= x.to && to >= x.from)) {
          issues.push(`${label}: a faixa de CEP se sobrepõe a outra regra.`);
        }
        ranges.push({ from, to });
      }
    }
  });

  const unique = [...new Set(issues)];

  return { ok: unique.length === 0, issues: unique };
}
