import { onlyDigits } from "../utils/validation";

// Busca de endereço por CEP via ViaCEP (feature 007, US5). Gratuito, sem chave.
// Nunca lança nem bloqueia o formulário: CEP inválido, "não encontrado", erro de
// rede ou timeout retornam `null` — a UI cai para preenchimento manual (SC-007).
const VIACEP_TIMEOUT_MS = 5000;

export async function lookupCep(cep) {
  const digits = onlyDigits(cep);

  if (digits.length !== 8) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VIACEP_TIMEOUT_MS);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // ViaCEP responde { erro: true } para CEP inexistente.
    if (!data || data.erro) {
      return null;
    }

    return {
      cep: data.cep || cep,
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    // Timeout (abort) ou falha de rede → preenchimento manual.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
