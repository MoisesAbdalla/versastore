# Tasks: Cupons de Desconto (013)

**Input**: Design documents from `/specs/013-cupons-desconto/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.md, contracts/ui.md, quickstart.md, research.md

**Tests**: INCLUÍDOS — toca o **total do pedido/venda** (Princípio II): cálculo por tipo, total não-negativo, validação, recálculo autoritativo no `createOrder`, incremento de uso no `pago`, e o apply/remove no checkout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US4 — mapeia para as user stories da spec.md
- Caminhos exatos incluídos

---

## Phase 1: Setup

- [x] T001 [P] Adicionar `ADMIN_COUPONS: "/admin/cupons"` em `frontend/src/constants/routes.js` e criar `frontend/src/constants/coupon.js` com `COUPON_TYPE` (`fixo`/`percentual`/`frete_gratis`) e rótulos pt-BR (Valor fixo / Percentual / Frete grátis)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: util de cálculo/validação + service + regra bloqueiam admin, checkout e pedido

- [x] T002 [P] Criar `frontend/src/utils/coupon.js` (contracts/services.md): `normalizeCode`, `couponStatus`, `isCouponValid({subtotal,now})`, `computeCouponEffect({subtotal,shipping})` (fixo com teto no subtotal; percentual arredondado; frete_gratis → freeShipping; `total = subtotal − discount + freteEfetivo` ≥ 0) e `validateCouponInput` — testes em `frontend/src/utils/__tests__/coupon.test.js` (status por estado; validação inativo/expirado/esgotado/minimo/ok; fixo/percentual/frete_gratis; total nunca negativo; form: código vazio, value 0, percent 150, datas invertidas)
- [x] T003 [P] Criar `frontend/src/services/couponService.js` (contracts/services.md): `listCoupons` (orderBy createdAt desc), `getCoupon(code)` (get por id, `null` se ausente), `createCoupon` (normaliza + unicidade via getCoupon + `validateCouponInput`; `usedCount:0`, `createdAt`), `updateCoupon`/`deleteCoupon`/`toggleCouponActive` — teste em `frontend/src/services/__tests__/couponService.test.js` (normaliza; duplicado lança; get por id; toggle/update/delete; Firestore mockado)
- [x] T004 Adicionar o bloco `match /coupons/{code}` em `firestore.rules` (`allow get: if isSignedIn()`; `allow list: if isAdmin()`; `allow write: if isAdmin()`) com comentário de deploy manual (feature 013). **Deploy `firebase deploy --only firestore:rules` é passo manual do lojista.**

**Checkpoint**: cálculo, validação, acesso a dados e regra prontos e testados

---

## Phase 3: User Story 1 - Lojista gerencia cupons (Priority: P1) 🎯 MVP

**Goal**: tela de cupons no admin com lista (status derivado) + formulário validado (criar/editar/ativar/remover).

**Independent Test**: quickstart §1 — criar percentual/fixo/frete grátis, ser bloqueado por percent 150 / código duplicado / datas invertidas, desativar e ver status.

- [x] T005 [US1] Criar `frontend/src/pages/Admin/Coupons/index.jsx` + `styles.module.css` (contracts/ui.md): lista (Código, Tipo, Valor, Status via `couponStatus`, Usos, ações) + formulário (código imutável na edição; tipo com Valor oculto para frete grátis; máscara BRL p/ fixo; pedido mínimo; validade; limite total; switch ativo); salvar valida via `validateCouponInput` (erros campo a campo) e grava via `couponService`; código duplicado → erro no campo; estados carregando/salvando/erro/vazio + `useFeedback`
- [x] T006 [US1] Registrar a rota `/admin/cupons` (lazy) sob `AdminRoute` em `frontend/src/routes/index.jsx` e adicionar o item **"Cupons"** ao `NAV_ITEMS` do `frontend/src/layouts/AdminLayout/index.jsx` (ícone de oferta/cupom, perto de Frete)

**Checkpoint**: lojista cria/edita/remove cupons e vê status

---

## Phase 4: User Story 2 - Cliente aplica cupom no checkout (Priority: P1)

**Goal**: aplicar/remover cupom no checkout, ver desconto e total recomposto; frete grátis por cupom; pedido gravado com o desconto recalculado pela autoridade.

**Independent Test**: quickstart §2 — aplicar percentual/fixo/frete grátis; recusa por mínimo/inativo; remover; total nunca negativo; confirmar grava.

- [x] T007 [US2] Estender `frontend/src/services/orderService.js` `createOrder`: aceitar `couponCode`; **na transação**, ler `coupons/{normalizeCode}` (fase de leituras), e após o subtotal autoritativo: `isCouponValid` (senão `throw serviceError("cupom-invalido", …)`), `computeCouponEffect` → gravar `couponCode`/`couponType`/`discount`, `shipping` efetivo (0 se frete grátis) + `shippingStatus`, e `total = subtotal − discount + freteEfetivo` — estender `frontend/src/services/__tests__/orderService.test.js` (recalcula discount e grava couponCode/couponType/total; cupom inválido → lança; frete_gratis → shipping 0 + status "gratis"; pedido sem cupom inalterado)
- [x] T008 [US2] Estender `frontend/src/hooks/useCheckout.js`: `applyCoupon(code)` (getCoupon + `isCouponValid` com o subtotal) / `removeCoupon()`; expor `appliedCoupon`, `couponError`, `discount`, `freeShipping`, `total = subtotal − discount + (freeShipping ? 0 : (shipping||0))`; `confirm()` passa `couponCode` ao `createOrder` e trata `cupom-invalido` (remove o cupom + avisa) — testes em `frontend/src/hooks/__tests__/useCheckout.test.jsx` (aplica válido → discount+total; inválido → couponError; frete_gratis → frete 0; remove volta total; confirm passa couponCode; createOrder "cupom-invalido" → mensagem + cupom removido)
- [x] T009 [US2] Atualizar `frontend/src/pages/Checkout/index.jsx` (contracts/ui.md): campo "Cupom de desconto" + Aplicar/Remover, mensagens por erro (inválido/expirado/esgotado/mínimo/não encontrado), e o resumo com **Desconto (CÓDIGO) −R$Z** (quando > 0) e **"Frete grátis (cupom)"** quando aplicável; `canConfirm` independe do cupom

**Checkpoint**: cliente aplica/remove cupom, vê o total correto e finaliza com o desconto congelado

---

## Phase 5: User Story 3 - Desconto congelado e visível no histórico (Priority: P2)

**Goal**: mostrar o desconto na composição do total em "Meus pedidos" (cliente) e no detalhe do pedido no admin; congelamento já garantido pelo `createOrder` (US2).

**Independent Test**: quickstart §3 — pedido com cupom mostra a linha de desconto nos dois lugares; alterar o cupom depois não muda o pedido.

- [x] T010 [US3] Exibir a linha **Desconto (CÓDIGO) −R$Z** (quando `discount > 0`) e o frete "Grátis (cupom)" (quando `couponType === "frete_gratis"`) na composição do total em `frontend/src/pages/Account/Orders/Detail/index.jsx`
- [x] T011 [US3] Exibir a mesma linha de desconto na composição do total no detalhe do pedido do **admin** (arquivo do painel de detalhe de pedido — localizar em `frontend/src/pages/Admin/Orders/…`)

**Checkpoint**: cliente e lojista veem o desconto congelado no pedido

---

## Phase 6: User Story 4 - Contagem de uso no pago (Priority: P3)

**Goal**: incrementar `usedCount` do cupom quando o pedido é pago (mesma transação dos agregados); pedido não pago não consome.

**Independent Test**: quickstart §4 — cupom limite 1, pagar um pedido → esgotado; outro checkout recusa; pedido não pago não incrementa.

- [x] T012 [US4] Estender `frontend/src/services/orderService.js` `advanceStatus`: quando `applyingPaid` e `order.couponCode`, ler `coupons/{couponCode}` (fase de leituras) e, se existe, `tx.update(couponRef, { usedCount: (usedCount||0)+1 })` na **mesma transação** dos agregados (guard `aggregatesApplied` garante 1x) — estender `frontend/src/services/__tests__/orderService.test.js` (incrementa usedCount no pago; **não** incrementa em transição não-pago; cupom ausente → não quebra)

**Checkpoint**: limite de uso efetivo (contado no pago), com o débito de corrida documentado p/ o M4b

---

## Phase 7: Polish & Cross-Cutting

- [x] T013 [P] Atualizar `docs/design-system.md` com a seção **Cupons** (tela do admin: lista + form; campo de cupom no checkout: aplicar/remover + mensagens; linha de desconto no resumo e no histórico)
- [x] T014 Gates finais: `npm run lint` (zero erros), `npm run test` (suíte + novos verdes), `npm run build` (bundle íntegro)
- [ ] T015 Regressão do quickstart (§1–5): checkout (009), frete (011), carrinho (M2), conta (007), variações (008), admin e vitrine intactos — **validação manual do usuário** (após o deploy da regra de `coupons`)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (T001)** → **Foundational (T002–T004)** bloqueiam as stories.
- **T002 (util)** é o núcleo; T003 (service) ∥ T002; T004 (regra) independente.
- **US1 (Phase 3)**: T005 depois de T002/T003; T006 por último.
- **US2 (Phase 4)**: T007 (createOrder) depois de T002; T008 depois de T002/T003 (∥ T007); T009 depois de T008.
- **US3 (Phase 5)**: T010/T011 depois de T007 (campos gravados).
- **US4 (Phase 6)**: T012 depois de T002 (só usa o doc do cupom).
- **Polish**: depois das stories.

### Ordem recomendada (MVP-first)
Setup → Foundational (T002 primeiro) → **US1** (admin gerencia) → **US2** (checkout aplica + pedido congela) → US3 (histórico) → US4 (uso no pago) → Polish.

### Parallel Opportunities
- Foundational: T002 ∥ T003 ∥ T004.
- US2: T007 ∥ T008 (arquivos diferentes; T009 depois de T008).
- Polish: T013 ∥ (antes dos gates).

## Notes
- **Sem backend**; `createOrder` é a **autoridade** do desconto (recalcula pelo código — FR-010); `advanceStatus` conta o uso no `pago`.
- **Regra nova** `match /coupons/{code}` (get autenticado; list/write admin) — **deploy manual**. **Sem índices novos**.
- Desconto sobre **subtotal**; frete grátis por cupom zera o frete; total **nunca negativo** (clarify 2026-07-17).
- Débito p/ o M4b: corrida concorrente no limite e reversão de uso no cancelamento (endurecimento server-side).
