# Quickstart — Checkout (M4a / 009)

Roteiro de validação ponta a ponta. Rodar `npm run dev`/`test`/`lint`/`build` em `frontend/`. Referências: [contracts/services.md](contracts/services.md), [contracts/firestore.md](contracts/firestore.md), [contracts/ui.md](contracts/ui.md), [data-model.md](data-model.md).

## Pré-requisitos
- Logado como **cliente** com perfil completo (007), ao menos um **endereço** salvo (M3) e itens no **carrinho** (M2).
- **Passo manual do usuário — deploy das rules** (necessário para o cliente criar pedido): depois de `firestore.rules` atualizado:
  ```bash
  firebase deploy --only firestore:rules
  ```
  Auditar antes no **Rules Playground** (orders create do dono; products decremento; counter +1; dailyStats/totais negados ao cliente).

## 1. Fluxo feliz (US1)
1. Carrinho → **"Finalizar compra"** → `/checkout`.
2. Conferir itens (revalidados) e subtotal; endereço padrão pré-selecionado; escolher método (ex.: Pix); digitar um **CPF válido**; (opcional) marcar "salvar para próximas compras".
3. **Confirmar pedido** → tela de sucesso com o número; o carrinho esvazia.
4. `/conta/pedidos` → o pedido aparece **aguardando pagamento**; detalhe mostra itens, endereço, método e CPF.
5. Conferir no Firestore: estoque **baixou**; `counters/orders` **+1**; o pedido tem `shipping: null`, `shippingStatus: "a_calcular"`, `total == subtotal`, `aggregatesApplied: false`; **`dailyStats` e `users.totalSpent` INALTERADOS** (não contaram na criação).

## 2. Bloqueios (US2/US3)
1. Sem endereço salvo → checkout orienta cadastrar (link `/conta/enderecos`) e **não** deixa confirmar.
2. CPF inválido (DV errado ou `111.111.111-11`) → erro no campo, confirmar bloqueado.
3. Sem método selecionado / carrinho vazio → confirmar bloqueado.
4. Item que **esgotou** desde que entrou no carrinho → aviso na revisão; confirmar só após revisar; se esgotou de vez, a criação falha atômica (nada baixado) com mensagem.
5. **Duplo clique** em confirmar → um único pedido.

## 3. Agregados no `pago` (refactor — regressão)
1. Como **admin** (painel M3), avançar o pedido para **"pago"** → agora sim `dailyStats` (receita) e `users.totalSpent`/`orderCount` **aumentam** (uma vez); `aggregatesApplied` vira `true`.
2. **Cancelar** um pedido **pendente** (nunca pago) → estoque volta, agregados **não** mudam.
3. **Cancelar/devolver** um pedido **pago** → estoque volta **e** agregados são revertidos.
4. Regressão do dashboard: a receita passa a contar no **pago**, não na criação (pedidos pendentes não inflam o faturamento).

## 4. Interface de pagamento (M4b-ready)
- Confirmar que o checkout chama `paymentProvider.createPayment` (stub → "pendente") e **não** conhece gateway; nenhuma cobrança/QR/redirect ocorre.

## Gates
- `npm run test` verde (validateCpf; refactor do orderService: criação sem agregados, pago aplica, cancelamento reverte só se pago; fluxo de checkout); `npm run lint` sem erros; `npm run build` íntegro.
- **Passo manual do usuário**: `firebase deploy --only firestore:rules` (auditado no Playground) antes de testar a criação em produção.

## Pendente para o M4b (não validar aqui)
- Cobrança real, webhook, avanço automático para `pago`, expiração/devolução por tempo, custom claims. O `pago` aqui é acionado **manualmente pelo admin**.
