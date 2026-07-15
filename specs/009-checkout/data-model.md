# Data Model — Checkout (M4a / 009)

Mudança **aditiva/retrocompatível**. Sem novas coleções.

## Pedido (`orders/{id}`) — campos novos/afetados

| Campo | Tipo | Notas |
|---|---|---|
| `customerId` | string (uid) | Já existe. **A M4a passa a criá-lo pelo cliente** (antes só admin). Rules validam `== auth.uid`. |
| `status` | string | Nasce `aguardando_pagamento` (já é o default do `createOrder`). |
| `items` | array | Congelados: `productId`, `variationId`, `name`, `variationLabel`, `unitPrice`, `quantity`, `imageUrl`. Já existe. |
| `shippingAddress` | objeto | **Cópia congelada** do endereço salvo escolhido (M3). |
| `paymentMethod` | string | `"pix" | "cartao" | "boleto"` — só a seleção. |
| `cpf` | string | **NOVO** — CPF do comprador (cópia congelada), validado por DV. |
| `subtotal` | number (centavos) | Soma dos itens. Já existe. |
| `shipping` | number \| null | **NOVO** — 0/null na M4a. |
| `shippingStatus` | string | **NOVO** — `"a_calcular"` na M4a (M5 muda para calculado). |
| `total` | number (centavos) | **`subtotal + shipping`** (com shipping 0 → total = subtotal; retrocompatível). |
| `aggregatesApplied` | boolean | **NOVO** — `false` na criação; vira `true` quando o pedido é pago (guarda para o estorno reverter agregados só se foram aplicados). |
| `statsDay` | string (yyyy-mm-dd) | Dia usado nos agregados. Passa a ser gravado/atualizado na transição **`pago`** (dia do pagamento), não na criação. |
| `orderNumber`, `statusHistory`, `productIds`, `createdAt`, `trackingCode`, `internalNotes` | — | Já existem, inalterados. |

## Perfil do cliente (`users/{uid}`) — campo novo

| Campo | Tipo | Notas |
|---|---|---|
| `cpf` | string | **NOVO (opt-in)** — gravado só se o cliente marcar "salvar para as próximas compras". Pré-preenche o checkout. Escrita do próprio usuário (rules de `users` já permitem update do próprio doc, exceto role/agregados). |
| `totalSpent` / `orderCount` | number | Já existem. **Não** mudam na criação do pedido; só na transição `pago` (via admin/M4b). Rules continuam bloqueando o próprio usuário de alterá-los. |

## Transições de estado e agregados (refactor do `orderService`)

- **Criação** (`createOrder`, cliente): `— → aguardando_pagamento`. Efeitos: congela itens, **baixa estoque** (`products`), **counter +1**. **Sem** `dailyStats`, **sem** `totalSpent`/`orderCount`. `aggregatesApplied = false`.
- **Pago** (`advanceStatus` alvo `pago`): `aguardando_pagamento → pago`. Efeitos: **aplica** `dailyStats` (receita do dia do pagamento) + `totalSpent`/`orderCount`; `aggregatesApplied = true`. Acionado por admin (M4a) ou webhook (M4b).
- **Cancelamento/devolução** (`restockAndClose`): **devolve estoque** sempre; reverte `dailyStats`/`totalSpent`/`orderCount` **apenas se `aggregatesApplied`** (pedido já pago). Pendente cancelado: só estoque.

## Índices / rules

- **Índices**: nenhum novo — "Meus pedidos" (M3) já usa `orders customerId + createdAt`.
- **Rules** (contracts/firestore.md): `orders` create pelo dono (`aguardando_pagamento`); `products` update decremental/não-negativo pelo cliente; `counters/orders` +1; `dailyStats`/`users`-agregados seguem negados ao cliente.

## Invariantes preservadas

- **Atomicidade**: criação continua numa única `runTransaction` (estoque + counter + order). Estoque insuficiente aborta tudo (nada criado/baixado).
- **Itens congelados**: preço/rótulo do momento imutáveis no pedido (M1/005) — inalterado.
- **Histórico**: pedidos existentes seguem válidos; `shipping` ausente em pedido antigo é lido como 0/`a_calcular` (retrocompatível); `total` antigo == `subtotal`.
