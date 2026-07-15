# Contracts — Firestore Rules (M4a / 009)

Mudança **escopada** para permitir a criação de pedido pelo cliente dono sem servidor. Auditar no Rules Playground antes do deploy. Deploy dos rules é **passo manual do usuário**.

## `orders`

```
allow read:   (mantém) admin || dono (customerId == uid)
allow create: admin
           || ( isSelf(request.resource.data.customerId)
                && request.resource.data.status == "aguardando_pagamento"
                && request.resource.data.aggregatesApplied == false )
allow update: (mantém) admin, hasOnly([...status, statusHistory, tracking, notes, customer*...])
allow delete: (mantém) admin
```
- O cliente cria **só o próprio** pedido, **só** `aguardando_pagamento`, **não** avança status (update segue admin-only). Itens/número/total são gravados pelo `orderService` na transação; a rule garante posse e status inicial.

## `products` (decremento pelo cliente na transação de compra)

```
allow read:  (mantém)
allow write: admin
          || ( isSignedIn()
               && diff só afeta [stock/variations/totalStock]
               && request.resource.data.totalStock <= resource.data.totalStock   // nunca aumenta
               && request.resource.data.totalStock >= 0 )                          // não-negativo
```
- Cliente só **diminui** estoque (nunca aumenta / nunca negativo) e só os campos de estoque. Limitação conhecida: a rule não valida o **valor exato** do decremento (Firestore não lê o pedido sendo criado na mesma transação) — dívida fechada no M4b (Function + custom claims).

## `counters/orders`

```
allow read:  (mantém admin) + isSignedIn()   // cliente precisa ler p/ gerar o número
allow write: admin
          || ( isSignedIn() && request.resource.data.current == resource.data.current + 1 )  // +1
```

## Inalterados (seguem negando o cliente)

- `dailyStats`: **admin only** — o cliente NÃO escreve (agregados só no `pago`).
- `users`: update do próprio doc já permitido **exceto** `role`/`orderCount`/`totalSpent` (mantém). O `cpf` opt-in cai na parte permitida (campo comum do próprio doc).

## Nota de segurança (datada)

As aberturas de `products` (decremento) e `counters` (+1) são forjáveis por um cliente malicioso fora de um pedido real (grief de estoque/numeração), porque as rules não validam consistência entre documentos de uma transação. Aceito **pré-lançamento**; **fechado no M4b** movendo criação/baixa para Cloud Function + custom claims (a rule então volta a `admin`/servidor).
