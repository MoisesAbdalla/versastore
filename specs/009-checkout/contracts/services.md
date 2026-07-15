# Contracts — Serviços (M4a / 009)

## `services/orderService.js` (REFATOR — o mais delicado; testar antes da UI)

- `createOrder({ customerId, items, shippingAddress, paymentMethod, cpf })` — mesma transação, com mudanças:
  - grava `cpf` (cópia congelada), `shipping: null`, `shippingStatus: "a_calcular"`, `subtotal`, `total = subtotal + (shipping||0)`, `aggregatesApplied: false`;
  - **baixa estoque** (`products`) + **counter +1** (mantém);
  - **REMOVE** deste ponto: `dailyStats` e `users.totalSpent`/`orderCount`.
- `advanceStatus(id, next, { byUid, byName })` — quando `next === "pago"` e o pedido ainda não aplicou agregados: **aplica** `dailyStats` (receita no dia do pagamento) + `users.totalSpent`/`orderCount`, e marca `aggregatesApplied = true`. Demais transições inalteradas.
- `restockAndClose(...)` (cancelar/devolver): devolve estoque sempre; reverte `dailyStats`/agregados do cliente **apenas se `aggregatesApplied`**; ao reverter, usa o `statsDay` gravado.

Testes (reusam o mock transacional em `orderService.test.js`):
- criação: baixa estoque + counter, **sem** mexer em `dailyStats`/`totalSpent`; grava `cpf`/`shipping`/`total`/`aggregatesApplied:false`;
- estoque insuficiente na criação → aborta atômico (nada criado/baixado);
- `advanceStatus → pago`: aplica `dailyStats` + `totalSpent`/`orderCount` uma única vez (idempotente por `aggregatesApplied`);
- cancelar pedido **pendente** (não pago): devolve estoque, **não** mexe em agregados;
- cancelar pedido **pago**: devolve estoque **e** reverte agregados.

## `services/paymentProvider.js` (NOVO — interface/stub)

- `createPayment(order) -> { status: "pendente", providerRef: null }` — no-op na M4a; contrato estável para o M4b (Mercado Pago) substituir sem tocar o checkout.

## `services/userService.js` (+ CPF opt-in)

- `saveCpf(uid, cpf)` — grava `cpf` no `users/{uid}` (opt-in); reusa o padrão de update do próprio doc.
- Leitura do CPF salvo vem do `getFullProfile`/`profile` já existente (AuthContext).

## `utils/validation.js` (+ CPF)

- `validateCpf(value) -> string | null` — valida os 2 dígitos verificadores; rejeita sequências repetidas (`000...`, `111...`); mensagem pt-BR "CPF inválido".
- `maskCpf(value) -> "000.000.000-00"`.
- Testes: CPFs válidos conhecidos, DV inválido, sequência repetida, tamanho errado; máscara progressiva.
