# Research — Checkout (M4a / 009)

Decisões de design (Fase 0). Formato: Decisão / Racional / Alternativas.

## R-1 — Estrutura do pedido: shipping + total desde a M4a

**Decisão**: o pedido nasce com `subtotal` (soma dos itens), `shipping` (0/null) + `shippingStatus: "a_calcular"`, e `total = subtotal + shipping`. O checkout exibe "Frete: a combinar".

**Racional**: decisão do `/clarify` — o M5 (frete real) só **preenche** `shipping` e recomputa `total` sem migrar pedidos nem mudar a lógica. Hoje `createOrder` grava `subtotal` e `total` iguais; passa a gravar `shipping` e `total = subtotal + shipping` (com shipping 0, total = subtotal, retrocompatível).

**Alternativas**: omitir frete / assumir grátis — rejeitadas (retrabalho/expectativa falsa).

## R-2 — Criação segura sem servidor: estoque na criação, agregados no `pago` (opção C)

**Decisão**: refatorar `orderService` para separar responsabilidades:
- `createOrder` (cliente): valida disponibilidade, **congela itens**, **baixa estoque**, gera **número** (counter +1), grava o pedido `aguardando_pagamento`. **NÃO** toca `dailyStats` nem `users.totalSpent`/`orderCount`.
- **Transição `pago`** (`advanceStatus` quando alvo = `pago`): **aplica** os agregados — receita (`dailyStats`) + `totalSpent`/`orderCount` do cliente. Em M4a o `pago` é acionado pelo **admin** (fluxo M3 existente); em M4b, pelo **webhook** — mesma transição.
- **Cancelamento/devolução** (`restockAndClose`): sempre **devolve estoque**; reverte agregados **apenas se o pedido já havia sido pago** (guarda `aggregatesApplied`/marca no pedido). Pedido pendente cancelado devolve estoque sem mexer em agregados.

**Racional**: pedido `aguardando_pagamento` não é venda — contar receita/totais na criação inflaria o faturamento (o cliente pode nunca pagar). Mover para `pago` é mais correto **e** remove `dailyStats`/`totalSpent` do caminho do cliente (o que as rules não conseguem proteger contra forja). O M4b liga o webhook à mesma transição `pago`, sem reescrever a criação.

**Dia da receita**: a receita conta no **dia do pagamento** (`dayKey()` na transição `pago`); o pedido registra o dia aplicado para o estorno cair no mesmo dia. (Antes contava no dia da criação.)

**Alternativas**: (A) cliente cria só o pedido, estoque/número depois — rejeitada (pedido sem número/estoque, oversell até confirmar). (B) transação inteira no cliente — rejeitada (expõe `dailyStats`/`totalSpent` a forja).

## R-3 — Security rules da criação client-side (escopo mínimo)

**Decisão**: abrir o mínimo necessário, com o que as rules **conseguem** validar:
- `orders` **create**: `isSelf(customerId)` E `status == "aguardando_pagamento"` E `customerId == request.auth.uid`; itens/número/cliente imutáveis (o `update` continua admin-only para status; cliente nunca muda status).
- `products` **update** por cliente autenticado: permitido **apenas** quando o novo `totalStock`/`stock` **não aumenta** e não fica negativo (decremento) — limita grief; a rule não valida o valor exato do decremento (limitação do Firestore), fechada no M4b.
- `counters/orders` **update** por cliente autenticado: apenas `current == old + 1` (incremento unitário).
- `dailyStats` e `users.totalSpent`/`orderCount`: **permanecem negados** ao cliente (como hoje) — não entram no caminho da criação.

**Racional**: cumpre a criação transacional com a menor superfície forjável possível dado que as rules não checam consistência entre documentos de uma transação. A dívida residual (um cliente malicioso poderia decrementar estoque/counter fora de um pedido real) é **pré-lançamento** e **fechada no M4b** (criação/baixa movida para Cloud Function + custom claims). Auditada no contracts/firestore.md.

**Alternativas**: liberar geral (rejeitada — forja de estoque/stats/totais); exigir Cloud Function agora (rejeitada — sem Blaze).

## R-4 — Interface de pagamento (PaymentProvider)

**Decisão**: `services/paymentProvider.js` expõe um contrato estável, ex.: `createPayment(order) -> { status, providerRef? }`. Na M4a, um **stub** que retorna `{ status: "pendente" }` (no-op, sem cobrança). O checkout e o `createOrder` **não conhecem** o gateway; o M4b substitui a implementação por Mercado Pago (via Function) sem tocar a tela.

**Racional**: isola o ponto de integração (FR-013); a M4b pluga sem reescrever o checkout.

**Alternativas**: embutir o pagamento no checkout — rejeitada (acoplaria o gateway à UI).

## R-5 — Validação de CPF + opt-in de salvar

**Decisão**: `validateCpf(value)` em `utils/validation.js` (algoritmo dos 2 dígitos verificadores; rejeita sequências tipo `111.111.111-11`) + `maskCpf`. O checkout coleta o CPF (pré-preenchido se salvo no perfil), valida campo a campo, e oferece um checkbox **opt-in** "salvar para as próximas compras" → `userService.saveCpf(uid, cpf)` (escrita do próprio usuário no próprio doc; permitida pelas rules de `users`). O pedido **sempre** guarda uma cópia do CPF.

**Racional**: reusa o padrão de validação/`FormField` do 007; opt-in respeita LGPD (o cliente decide persistir dado sensível).

**Alternativas**: salvar sempre (rejeitada — persiste dado sensível sem escolha); nunca salvar (rejeitada — atrito nas próximas compras).

## R-6 — Endereço: cópia congelada no pedido

**Decisão**: o checkout seleciona um endereço salvo (M3, `users.addresses`; padrão pré-selecionado) e **copia** o endereço para o pedido (`shippingAddress`) no momento da compra. O pedido guarda o endereço congelado, não uma referência mutável.

**Racional**: o histórico do pedido não pode mudar se o cliente editar/apagar o endereço depois. `createOrder` já aceita `shippingAddress`.

**Alternativas**: referência ao endereço salvo — rejeitada (mutável, quebra histórico).

## R-7 — Fluxo do checkout e revalidação do carrinho

**Decisão**: rota `/checkout` sob `PrivateRoute` (anônimo → login → volta). Ao montar, dispara a **revalidação** do carrinho (M2, `CartContext.revalidate`), exibe as mudanças (borda dourada, padrão do carrinho) e exige ciência antes de confirmar. Carrinho vazio → estado vazio (sem confirmar). Perfil incompleto (007) → completar cadastro antes (reusa o guard). Após criar, **esvazia o carrinho** e vai para `/checkout/sucesso`.

**Racional**: reusa a revalidação existente (não duplica); mantém consistência de estados com o carrinho.

**Alternativas**: revalidar só na confirmação — rejeitada (cliente escolheria endereço/método sobre dado velho).

## Resumo de impacto
- **Refator** do `orderService` (o mais delicado) coberto por testes antes da UI; `createOrder` mantém a assinatura mais `shipping`/opt-in; agregados migram para `pago`.
- **Rules**: 3 aberturas escopadas (orders create dono, products decremento, counter +1); `dailyStats`/`totalSpent` seguem negados ao cliente. Novo índice? Não — "Meus pedidos" já usa `customerId+createdAt`.
- **Sem backend**; pagamento é stub atrás de interface; dívida de segurança datada para o M4b.
