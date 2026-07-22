# Data Model — Relatórios Ampliados (018)

## `dailyStats/{yyyy-mm-dd}` — campos aditivos (escrita no `pago`, revertida no cancelamento)

| Campo | Tipo | Notas |
|---|---|---|
| `revenue` | number | (existente) soma de `order.total` (líquido) |
| `orderCount` | number | (existente) |
| `unitsSold` | number | (existente) |
| `unitsByProduct` | map | (existente) `{ productId: { name, units } }` |
| `discountTotal` | number | **novo** — soma de `order.discount` (0 se sem cupom) |
| `byCategory` | map | **novo** — `{ categoryId: { name, revenue, units } }`; `revenue` = Σ `unitPrice×qty` dos itens da categoria; sem categoria → chave `"sem-categoria"` |
| `byPaymentMethod` | map | **novo** — `{ pix, cartao, boleto }` contagem de pedidos |
| `byDeliveryMethod` | map | **novo** — `{ entrega, retirada }` contagem de pedidos |

`emptyStats()` inclui os novos campos zerados. Todos aplicados com `direction ±1` no mesmo `applyStatsDelta`; ao zerar (revert), entradas de map são removidas como já ocorre com `unitsByProduct`.

**Forward-only**: dias anteriores ao deploy não têm os campos → lidos como 0/vazio. Relatórios sinalizam a partir de quando há cobertura.

## Item congelado do pedido (`orders/*.items[]`) — campos aditivos

| Campo | Tipo | Notas |
|---|---|---|
| `categoryId` | string \| null | **novo** — gravado na criação (`product.categoryId`) |
| `categoryName` | string | **novo** — `product.categoryName` \| `product.category` \| "" |

Permite o `byCategory` no `pago` sem leitura extra. Não afeta pedidos existentes (campos ausentes → "sem-categoria").

## Cupom (`coupons/*`, feature 013) — leitura

- `code`, `type`, `usedCount`, status derivado (`couponStatus`) via `listCoupons` — snapshot para o relatório de cupons.

## Derivados (runtime, sem persistência)

- **KPIs do período**: `{ revenue, orderCount, unitsSold, discountTotal, avgTicket }` + `deltas{}` (vs. período anterior de mesma duração).
- **Série**: um ponto/dia (`revenue`, `orderCount`) para o gráfico (já existe em `getSalesSeries`).
- **Unidades por categoria (retroativo)**: `getTopProducts` × catálogo (`categoryName`).
- **Mix**: contagem por `byPaymentMethod`/`byDeliveryMethod` somada no range.
- **coverageStart**: 1º dia do range com os campos novos (para o aviso forward-only).

## Regras / Índices

- **Nenhuma mudança** em `firestore.rules` nem `firestore.indexes.json`. `dailyStats` já é admin; range por `documentId()` não exige índice composto.
