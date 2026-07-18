# Research — Cupons de Desconto (013)

Decisões (Fase 0). Formato: Decisão / Racional / Alternativas.

## R-1 — Coleção `coupons` com doc id = código normalizado

**Decisão**: guardar cada cupom num doc da coleção `coupons`, com **id = código normalizado** (trim + maiúsculas, ex.: `BEMVINDO10`). Campos: `type`, `value`, `minSubtotal?`, `startAt?`, `endAt?`, `maxUses?`, `usedCount`, `active`, `createdAt`.

**Racional**: id = código permite o cliente ler **um** cupom por `get(coupons/{CODE})` na validação do checkout **sem** precisar de `list` (que exporia todos os códigos — FR-014). A busca vira O(1) por id, sem índice. Normalizar na criação e no apply torna o match case-insensitive (FR-013).

**Alternativas**: id auto-gerado + query `where("code","==")` — rejeitada (exige regra de `list`/índice e permite enumerar; `get` por id é mais seguro e barato).

## R-2 — Regras: `get` autenticado, `list`/escrita só admin

**Decisão**: bloco novo em `firestore.rules`:
```
match /coupons/{code} {
  allow get: if isSignedIn();      // cliente valida um código conhecido
  allow list: if isAdmin();        // só admin enumera todos
  allow write: if isAdmin();       // criar/editar/remover + incrementar usedCount no pago (admin marca pago)
}
```

**Racional**: o cliente nunca escreve em `coupons` — ele só **lê** para validar. O **incremento de `usedCount`** acontece quando o **admin** marca o pedido como `pago` (ação admin), então `allow write: if isAdmin()` já cobre — sem incremento forjável pelo cliente (diferente da baixa de estoque da M4a, que o cliente faz). Separar `get` de `list` impede a enumeração de cupons. Deploy manual (como as rules do M4a).

**Alternativas**: cliente incrementa `usedCount` na criação — rejeitada (forjável e conta pedido não pago; contradiz a decisão "no pago").

## R-3 — `createOrder` é a autoridade do desconto (recalcula pelo código)

**Decisão**: o checkout passa apenas `couponCode` ao `createOrder`; **dentro da transação**, o `createOrder` lê `coupons/{code}`, revalida contra o **subtotal autoritativo** (calculado dos itens congelados) e o **agora**, e **recalcula** `discount`/`couponType`/frete grátis. Se o cupom ficou inválido (expirou, foi desativado, esgotou, ou subtotal < mínimo) → lança `serviceError("cupom-invalido", …)`; o checkout remove o cupom, avisa e deixa refazer (FR-010).

**Racional**: o valor do desconto não pode vir do client (seria forjável). Recalcular na criação fecha a janela "aplicou e o cupom mudou até finalizar" (edge case da spec). Espelha o padrão da M4a: o `createOrder` é a fonte de verdade de preço/estoque; agora também do desconto.

**Alternativas**: gravar o `discount` que o client enviou — rejeitada (forjável). Silenciosamente ignorar cupom inválido no create — rejeitada (cobraria mais que o exibido; a spec pede avisar).

## R-4 — Contagem de uso no `pago`, na transação do `advanceStatus`

**Decisão**: no `advanceStatus`, quando `applyingPaid` (transição para `pago` pela 1ª vez) e o pedido tem `couponCode`, ler `coupons/{couponCode}` (na fase de leituras) e **incrementar `usedCount` +1** (na fase de escritas), tudo na **mesma transação** que aplica os agregados. O guard `aggregatesApplied` (já existente) garante que o incremento ocorre **uma vez**.

**Racional**: alinha o uso do cupom à venda confirmada (clarify) e reusa exatamente o gancho de agregados-no-pago do M4a — pedido pendente/cancelado não consome uso. Atomicidade com a mudança de status. Cupom deletado depois: `get` retorna inexistente → pula o incremento (o desconto já está congelado no pedido).

**Alternativas**: função separada pós-pago / listener — rejeitada (perde atomicidade; o M4a já concentra o "virou venda" no `advanceStatus`). **Débito conhecido**: sem servidor, duas criações concorrentes do mesmo cupom no limite podem ambas ser pagas e ultrapassar `maxUses` (corrida cross-doc que as rules não barram) — endurecido no M4b (webhook confiável). Documentado, não bloqueia.

## R-5 — Três tipos e a base do desconto

**Decisão**: `computeCouponEffect(coupon, { subtotal, shipping })`:
- **fixo**: `discount = min(value, subtotal)` (nunca passa do subtotal).
- **percentual**: `discount = min(round(subtotal × value/100), subtotal)`.
- **frete_gratis**: `discount = 0`, `freeShipping = true`, `effectiveShipping = 0`.
- `total = subtotal − discount + (freeShipping ? 0 : (shipping || 0))` → **sempre ≥ 0** (pois `discount ≤ subtotal` e `shipping ≥ 0`).

A regra de **frete grátis por valor** do M5a continua avaliando o **subtotal antes** do desconto (o cupom não derruba o subtotal para efeito da regra de frete).

**Racional**: cobre os três tipos com uma função pura testável; o teto no subtotal garante o SC-003 (total nunca negativo) sem casos especiais. Frete grátis é ortogonal ao desconto de itens (zera só o frete).

**Alternativas**: desconto sobre subtotal+frete — rejeitada no clarify. Tipo frete grátis como desconto = valor do frete — equivalente numérico, mas modelar como `effectiveShipping = 0` mantém o `discount` significando "desconto no subtotal" e a linha de frete mostrando "grátis (cupom)".

## R-6 — Status derivado do cupom (admin) e validação de aplicação

**Decisão**: dois utilitários puros:
- `couponStatus(coupon, now)` → `ativo | inativo | expirado | esgotado` (derivado de `active`, janela de validade, `usedCount ≥ maxUses`) — para o **badge** da lista no admin.
- `isCouponValid(coupon, { subtotal, now })` → `{ ok, error }` com `error ∈ inativo|expirado|esgotado|minimo` — para o **apply** no checkout e a **revalidação** no `createOrder`. "não encontrado" é tratado pelo service (doc ausente).

**Racional**: separar exibição (status) de decisão (valid) evita ramificar mensagens no componente; ambos derivam dos mesmos campos, sem estado persistido de status (que poderia divergir). Testável isoladamente.

## R-7 — Validação do formulário do admin

**Decisão**: `validateCouponInput(form)` (reusado pelo form e defensivamente no service): código não vazio e **único** (o service confere via `getCoupon` antes de criar); `value > 0` para fixo/percentual; **percentual ≤ 100**; `endAt ≥ startAt` quando ambos presentes; `maxUses ≥ 0`. Código **imutável** após criação (é o id) — editar código = novo cupom.

**Racional**: FR-002; garante cupons coerentes. Código imutável evita renomear id (custo de migração de doc) e mantém pedidos antigos rastreáveis pelo `couponCode` congelado.

## Resumo de impacto
- **Nova coleção `coupons`** + **um bloco novo em `firestore.rules`** (deploy manual). **Sem índices novos**.
- Pedido ganha `couponCode`/`couponType`/`discount` (aditivo, congelado); `total` já era `subtotal + frete` (M4a) → agora `− desconto`.
- `createOrder` recalcula o desconto (autoridade); `advanceStatus` incrementa `usedCount` no `pago`.
- Endurecimento server-side do limite (corrida) fica para o M4b/Blaze.
