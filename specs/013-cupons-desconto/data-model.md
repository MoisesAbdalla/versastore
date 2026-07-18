# Data Model — Cupons de Desconto (013)

## Coleção `coupons` (NOVA)

Doc id = **código normalizado** (trim + maiúsculas). Um doc por cupom.

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `code` | string | sim | == id do doc; maiúsculas. Imutável após criação. |
| `type` | string | sim | `"fixo"` \| `"percentual"` \| `"frete_gratis"` |
| `value` | number | fixo/percentual | fixo: centavos de R$; percentual: 1–100. Ignorado para `frete_gratis`. |
| `minSubtotal` | number \| null | não | subtotal mínimo (centavos) para o cupom valer. null = sem mínimo. |
| `startAt` | Timestamp \| null | não | início da validade. null = sem início. |
| `endAt` | Timestamp \| null | não | fim da validade. null = sem fim. |
| `maxUses` | number \| null | não | limite **total** de usos. null = ilimitado. |
| `usedCount` | number | sim | uso acumulado; incrementado **+1 no `pago`**. Começa em 0. |
| `active` | boolean | sim | liga/desliga o cupom sem apagar. |
| `createdAt` | Timestamp | sim | `serverTimestamp()` na criação. |

**Status derivado** (não persistido) via `couponStatus(coupon, now)`:
- `inativo` se `!active`;
- `expirado` se fora da janela `[startAt, endAt]`;
- `esgotado` se `maxUses != null && usedCount >= maxUses`;
- senão `ativo`.

**Regras de validação (admin, `validateCouponInput`)**: `code` não vazio + único; `value > 0` (fixo/percentual); `percentual ≤ 100`; `endAt ≥ startAt` se ambos; `maxUses ≥ 0`.

## Pedido (`orders/*`) — campos aditivos

A M4a já grava `subtotal`, `shipping`, `shippingStatus`, `total`. A 013 adiciona (congelados):

| Campo | Tipo | Notas |
|---|---|---|
| `couponCode` | string \| null | código aplicado (normalizado) ou null. |
| `couponType` | string \| null | `"fixo"`/`"percentual"`/`"frete_gratis"` do cupom aplicado, para exibição inequívoca. |
| `discount` | number | desconto aplicado ao **subtotal** (centavos); 0 se sem cupom ou frete grátis. |

Composição do total (recalculada pelo `createOrder`, autoridade):
```
shippingEfetivo = (couponType === "frete_gratis") ? 0 : (shipping || 0)
total           = subtotal − discount + shippingEfetivo   // sempre ≥ 0
```
Para `frete_gratis`: `shipping` gravado = 0 e `shippingStatus` = `"gratis"`.

**Congelamento**: alterar/remover o cupom depois **não** muda pedidos existentes (os campos ficam no doc do pedido). O incremento de `usedCount` no cupom é a única escrita cruzada, feita no `pago`.

## Transições que tocam cupom

| Momento | Efeito no cupom | Onde |
|---|---|---|
| Checkout aplica | leitura `get(coupons/{code})` + `isCouponValid` | `useCheckout` / `couponService.getCoupon` |
| `createOrder` | revalida + recalcula `discount`/`couponType`/frete; grava congelado no pedido | `orderService.createOrder` (transação) |
| `advanceStatus` → `pago` (1ª vez) | `usedCount += 1` (se cupom existe) | `orderService.advanceStatus` (mesma transação dos agregados) |
| cancelamento/devolução | **não** decrementa `usedCount` na 013 | — (débito: reversão de uso fica p/ o M4b) |

## Índices / Regras

- **Sem índice novo**: `listCoupons` é leitura simples ordenada (`orderBy(createdAt)` ou por code); `getCoupon` é por id.
- **Regra nova** `match /coupons/{code}`: `get` autenticado, `list`/`write` admin (ver research R-2). **Deploy manual.**
