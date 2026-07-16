import { getShippingSettings } from "./settingsService";
import { computeShipping } from "../utils/shipping";

// Interface de provedor de frete (feature 011 / M5a). Ponto de integração
// ESTÁVEL para o M5b plugar a API real (Melhor Envio/SuperFrete) sem reescrever
// o checkout: o checkout só conhece `quote({ cep, subtotal })`.
//
// Na M5a a implementação é por TABELA (settings/shipping). Retorna uma lista de
// OPÇÕES (a M5a produz uma; a M5b, várias — PAC/SEDEX/…), mantendo o contrato.
export async function quote({ cep, subtotal }) {
  const settings = await getShippingSettings();
  const result = computeShipping(settings, { cep, subtotal });

  if (result.error) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    options: [
      {
        method: result.method,
        price: result.price,
        etaDays: result.etaDays,
        free: result.free,
      },
    ],
  };
}
