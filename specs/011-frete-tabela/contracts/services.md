# Contracts — Serviços (M5a / 011)

## `utils/shipping.js` (NOVO — regra pura, reusada por provider e form)

- `cepToNumber(cep) -> number` (só dígitos).
- `matchRule(settings, { cep, subtotal }) -> Rule | "default" | null` — 1ª regra cuja faixa de CEP contém o CEP e (se tiver) o subtotal na faixa de valor; senão `defaultRule` (se houver) → "default"; senão `null`.
- `computeShipping(settings, { cep, subtotal }) -> { price, etaDays, method, free } | { error: "sem_regra" | "sem_config" }` — aplica: frete grátis (subtotal ≥ threshold) → `{price:0, free:true, method:"Frete grátis"}`; senão a regra/`defaultRule`; senão `error`.
- `validateShippingSettings(settings) -> { ok, issues }` — faixas de CEP bem formadas (8 dígitos, from ≤ to), valor/prazo ≥ 0 preenchidos, **sem sobreposição** de faixas entre regras.

Testes: frete grátis prevalece; regra por região; regra por faixa de valor; defaultRule quando sem regra; `sem_regra` quando sem default; validação (sobreposição, faixa malformada, valor/prazo vazio).

## `services/shippingProvider.js` (NOVO — interface p/ o M5b)

- `quote({ cep, subtotal }) -> { ok, options?, error? }`. Na M5a: lê `getShippingSettings`, chama `computeShipping`; sucesso → `{ ok:true, options:[{ method, price, etaDays, free }] }`; sem regra/config → `{ ok:false, error }`. Contrato estável para o M5b (API → várias opções).

## `services/settingsService.js` (+ frete)

- `getShippingSettings() -> { rules, defaultRule, freeShippingThreshold }` (doc `settings/shipping`; default vazio se ausente).
- `updateShippingSettings(changes)` — merge no doc (escrita admin).

## `services/orderService.js` (+ campos de frete)

- `createOrder({ ..., shipping })` passa a aceitar o frete **calculado** (valor + etaDays + method + cep) e gravá-lo congelado; `shippingStatus` = `"calculado"`/`"gratis"`; `total = subtotal + (shipping||0)`. Sem mudança na transação de estoque/agregados (M4a).

Testes: `createOrder` grava shipping/etaDays/method/cep e total = subtotal + shipping; frete 0 → status "gratis".
