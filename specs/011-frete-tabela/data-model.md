# Data Model — Frete por Tabela (M5a / 011)

Mudança **aditiva**. Novo doc de config; pedido ganha campos de frete. Sem novas coleções.

## Configuração de frete (`settings/shipping`) — NOVO

| Campo | Tipo | Notas |
|---|---|---|
| `rules` | `Array<Rule>` | Regras por região, na ordem de prioridade (primeira que casa vence). |
| `defaultRule` | `{ price, etaDays } \| null` | Frete padrão "demais regiões" (catch-all) para CEP sem regra específica. `null` = bloquear CEP sem regra. |
| `freeShippingThreshold` | number (centavos) \| null | Subtotal ≥ limite → frete R$0. `null`/0 = sem frete grátis. Também alimenta o banner. |

**Rule**:

| Campo | Tipo | Notas |
|---|---|---|
| `region` | string | Nome exibível (ex.: "Sudeste"). |
| `cepRanges` | `Array<{ from, to }>` | Faixas de CEP (8 dígitos; `from ≤ to`). Sem sobreposição entre regras. |
| `price` | number (centavos) | Valor do frete. |
| `etaDays` | number | Prazo estimado (dias). |
| `minSubtotal` / `maxSubtotal` | number \| null | Opcional: aplica a regra só nessa faixa de valor do pedido (FR-002). |

Leitura: **pública** (checkout + banner). Escrita: **admin**. As rules atuais de `settings/{id}` já cobrem — **sem mudança de rules**.

## Pedido (`orders/{id}`) — campos de frete (preenchidos pela M5a)

| Campo | Tipo | Notas |
|---|---|---|
| `shipping` | number \| null | **Preenchido** com o valor calculado (0 = grátis). Antes (M4a) nascia `null`. |
| `shippingStatus` | string | `"a_calcular"` (M4a) → **`"calculado"`** ou **`"gratis"`** quando o frete é definido. |
| `shippingEtaDays` | number \| null | **NOVO** — prazo estimado congelado. |
| `shippingMethod` | string | **NOVO** — rótulo (região/"Frete grátis"/"Demais regiões"). |
| `shippingCep` | string | **NOVO** — CEP usado no cálculo. |
| `total` | number | `subtotal + (shipping||0)` — lógica já da M4a. |

Todos **congelados** na compra: mudar a tabela depois não altera pedidos existentes.

## Interface `shippingProvider` (contrato p/ o M5b)

`quote({ cep, subtotal }) -> { ok, options?, error? }`, `options: [{ method, price, etaDays, free }]`. M5a (tabela): 1 opção (regra/grátis) ou `{ ok:false, error:"sem_regra" }`. M5b (API): várias opções, mesma forma.

## Regras / índices

- **Rules**: nenhuma mudança — `settings/{id}` já é leitura pública + escrita admin; `orders` create do dono (M4a) já permite o cliente gravar o pedido com os campos de frete.
- **Índices**: nenhum novo.

## Retrocompatibilidade

- Pedidos antigos (M4a) sem `shippingEtaDays`/`shippingMethod`/`shippingCep` são lidos como ausentes; `shipping: null`/`shippingStatus: "a_calcular"` seguem válidos. `total` antigo == `subtotal`.
- Config ausente (`settings/shipping` não criado): checkout mantém "a combinar" e orienta; banner some.
