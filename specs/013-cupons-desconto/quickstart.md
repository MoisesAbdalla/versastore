# Quickstart — Cupons de Desconto (013)

Validação ponta a ponta. Rodar `npm run dev`/`test`/`lint`/`build` em `frontend/`. Referências: [contracts/services.md](contracts/services.md), [contracts/ui.md](contracts/ui.md), [data-model.md](data-model.md).

## Pré-requisitos
- **Deploy da regra nova** de `coupons`: `firebase deploy --only firestore:rules` (bloco `match /coupons/{code}` — `get` autenticado, `list`/`write` admin). **Passo manual do lojista.**
- Logado como **admin** (para gerenciar cupons e marcar pago) e como **cliente** com carrinho (para o checkout).

## 1. Gerenciar cupons (US1)
1. Admin → **Cupons** (`/admin/cupons`).
2. Criar `BEMVINDO10` — tipo **percentual**, valor **10**, ativo. Salvar.
3. Criar `MENOS20` — tipo **valor fixo**, R$20, **pedido mínimo** R$100.
4. Criar `FRETEGRATIS` — tipo **frete grátis**, ativo (campo Valor some).
5. Tentar salvar percentual **150** / código **duplicado** / **data fim antes da início** → bloqueado com erro campo a campo.
6. Desativar um cupom → aparece como **inativo** na lista; um com validade encerrada → **expirado**.

## 2. Aplicar cupom no checkout (US2)
1. Cliente com subtotal R$200 → aplicar `BEMVINDO10` → resumo mostra **Desconto (BEMVINDO10) −R$20,00** e **Total** reduzido.
2. Subtotal R$80 → aplicar `MENOS20` → recusado: **"Pedido mínimo de R$100,00 não atingido"**.
3. Aplicar código inexistente/inativo/expirado → mensagem específica; sem desconto.
4. Aplicar `FRETEGRATIS` → frete vira **"Frete grátis (cupom)"**, total = subtotal.
5. **Remover** o cupom → desconto some, total volta ao valor sem desconto.
6. Total nunca negativo: um cupom fixo maior que o subtotal → desconto limitado (total R$0 mínimo).

## 3. Congelamento + histórico (US3)
1. Finalizar um pedido com `BEMVINDO10` → o pedido grava `couponCode`, `couponType`, `discount` e o `total` com desconto.
2. Ver em **Meus pedidos** e no **admin**: a linha **Desconto (BEMVINDO10) −R$20,00** na composição do total.
3. **Alterar/remover** o cupom no admin → o pedido antigo mantém o desconto congelado.

## 4. Contagem de uso no pago (US4)
1. Criar `LIMITE1` — **limite de uso total 1**.
2. Criar e **marcar como pago** (admin) um pedido com `LIMITE1` → `usedCount` vai a **1**; a lista mostra **esgotado**.
3. Outro cliente tenta aplicar `LIMITE1` no checkout → **"Cupom esgotado"**.
4. Criar um pedido com `LIMITE1` e **NÃO** pagar (deixar pendente/cancelar) → `usedCount` **não** incrementa.

## 5. Revalidação na finalização (edge)
1. Aplicar um cupom válido, então (noutra aba admin) **desativá-lo/expirá-lo** antes de confirmar.
2. Confirmar → o `createOrder` recusa com aviso ("o cupom deixou de ser válido"); refazer sem o cupom finaliza normalmente.

## Gates
- `npm run test` verde (util de cupom: status/validação/cálculo/total-não-negativo; couponService; orderService recalcula desconto + incrementa uso no pago; useCheckout aplica/remove/total); `npm run lint` sem erros; `npm run build` íntegro.
- Regressão: checkout (009), frete (011), carrinho (M2), conta (007), variações (008), admin, vitrine intactos.

## Pendente para o M4b (não validar aqui)
- Endurecimento server-side do limite de uso (corrida concorrente cross-doc), reversão de uso no cancelamento — dependem do Blaze/webhook confiável.
