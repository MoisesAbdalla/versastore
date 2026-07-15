# Tasks: Checkout (M4a)

**Input**: Design documents from `/specs/009-checkout/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.md, contracts/firestore.md, contracts/ui.md, quickstart.md, research.md

**Tests**: INCLUÍDOS — toca estoque/pedido (Princípio II, NON-NEGOTIABLE): validação de CPF, refactor do orderService (estoque na criação, agregados no pago, estorno condicional) e os bloqueios do checkout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US3 — mapeia para as user stories da spec.md
- Caminhos exatos incluídos em cada tarefa

---

## Phase 1: Setup

- [ ] T001 [P] Adicionar `CHECKOUT: "/checkout"` (e `/checkout/sucesso`) em `frontend/src/constants/routes.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: o refactor do pedido e a validação de CPF bloqueiam o checkout

- [ ] T002 [P] Adicionar `validateCpf` (2 dígitos verificadores; rejeita sequências repetidas) e `maskCpf` em `frontend/src/utils/validation.js` — testes em `frontend/src/utils/__tests__/validation.test.js` (CPF válido/DV inválido/sequência/tamanho; máscara)
- [ ] T003 **REFACTOR do `frontend/src/services/orderService.js`** (contracts/services.md): `createOrder` passa a gravar `cpf`, `shipping: null`, `shippingStatus: "a_calcular"`, `total = subtotal + (shipping||0)`, `aggregatesApplied: false`, e **NÃO** escreve `dailyStats` nem `users.totalSpent/orderCount` (mantém baixa de estoque + counter); `advanceStatus` aplica os agregados quando alvo=`pago` (uma vez, guardado por `aggregatesApplied`, no dia do pagamento); `restockAndClose` reverte agregados **só se `aggregatesApplied`** — estender `frontend/src/services/__tests__/orderService.test.js` (criação sem agregados; pago aplica 1x; cancelar pendente não mexe em agregados; cancelar pago reverte; estoque insuficiente aborta atômico)
- [ ] T004 [P] Criar `frontend/src/services/paymentProvider.js`: `createPayment(order) → { status: "pendente", providerRef: null }` (stub/interface p/ o M4b) — teste simples em `frontend/src/services/__tests__/paymentProvider.test.js`
- [ ] T005 [P] Adicionar `saveCpf(uid, cpf)` em `frontend/src/services/userService.js` (opt-in; update do próprio doc) — teste em `frontend/src/services/__tests__/userService.test.js`

**Checkpoint**: pedido refatorado (estoque na criação, agregados no pago) e CPF/pagamento prontos e testados

---

## Phase 3: User Story 1 - Cliente finaliza a compra e gera o pedido (Priority: P1) 🎯 MVP

**Goal**: da revisão do carrinho à criação do pedido `aguardando_pagamento`, com o pedido aparecendo em "Meus pedidos".

**Independent Test**: quickstart §1 — com carrinho, endereço e CPF válido, confirmar e ver o pedido criado (estoque baixou, carrinho esvaziou, aparece em Meus pedidos) sem agregados na criação.

- [ ] T006 [US1] Criar `frontend/src/hooks/useCheckout.js` (contracts/ui.md): revalida o carrinho (M2) ao montar; estados de endereço (padrão pré-selecionado), CPF (pré-preenchido de `profile.cpf`, `validateCpf`, opt-in), método, `canConfirm` e `confirm()` (chama `paymentProvider` + `orderService.createOrder` + `saveCpf` se opt-in + `clear()` do carrinho + navega ao sucesso; bloqueia reenvio) — teste em `frontend/src/hooks/__tests__/useCheckout.test.jsx` (canConfirm; confirm chama createOrder e esvazia; duplo submit)
- [ ] T007 [US1] Criar `frontend/src/pages/Checkout/index.jsx` + `styles.module.css`: tela única (Itens revalidados, Endereço, CPF, Pagamento, Resumo com subtotal + "Frete: a combinar" + total) sob `MainLayout`; botão "Confirmar pedido" desabilitado até `canConfirm`; estados carregando/erro
- [ ] T008 [US1] Criar `frontend/src/pages/Checkout/Success/index.jsx` + `styles.module.css`: "pedido criado / aguardando pagamento" com o número + CTAs "Ver meus pedidos" e "Continuar comprando"
- [ ] T009 [US1] Registrar as rotas `/checkout` e `/checkout/sucesso` sob `PrivateRoute` em `frontend/src/routes/index.jsx`; habilitar o botão "Finalizar compra" do `frontend/src/pages/Cart/index.jsx` para navegar a `/checkout` (quando carrinho não vazio)

**Checkpoint**: cliente gera pedido pendente ponta a ponta; aparece em Meus pedidos (M3)

---

## Phase 4: User Story 2 - Revisão do carrinho revalidado (Priority: P1)

**Goal**: nunca criar pedido com preço/estoque velho; avisar e exigir revisão.

**Independent Test**: quickstart §2.4 — item que esgotou/mudou de preço aparece sinalizado e bloqueia confirmar até revisar; carrinho vazio → estado vazio.

- [ ] T010 [US2] No `useCheckout`/`Checkout`, exibir as `changes` da revalidação (borda dourada, padrão do carrinho) e travar `canConfirm` até ciência (`mustReview`); estado vazio quando o carrinho fica sem itens — teste no `useCheckout.test.jsx` (mudança bloqueia; vazio bloqueia)

**Checkpoint**: pedido só nasce sobre carrinho revisado e válido

---

## Phase 5: User Story 3 - Endereço e CPF válidos antes de confirmar (Priority: P1)

**Goal**: sem endereço/CPF válido, não confirma.

**Independent Test**: quickstart §2.1–2.3 — sem endereço → CTA e bloqueio; CPF inválido → erro; endereço+CPF válido → habilita.

- [ ] T011 [US3] No `Checkout`, seleção entre endereços salvos (padrão pré-selecionado) e, sem nenhum, CTA para `/conta/enderecos` + bloqueio; campo CPF (`FormField` + `maskCpf` + `validateCpf`) + checkbox opt-in — coberto pelos testes de `useCheckout` (endereço/CPF em `canConfirm`)

**Checkpoint**: endereço e CPF válidos são pré-condição da confirmação

---

## Phase 6: Segurança (rules) e passo manual

- [ ] T012 Atualizar `firestore.rules` (contracts/firestore.md): `orders` create pelo dono (`aguardando_pagamento`, `aggregatesApplied==false`); `products` update decremental/não-negativo por cliente autenticado; `counters/orders` read p/ logado + update `+1`; `dailyStats`/`users`-agregados seguem negados ao cliente
- [ ] T013 **[DEPLOY MANUAL DO USUÁRIO — não é código]** Auditar no Rules Playground e rodar `firebase deploy --only firestore:rules` antes de testar a criação de pedido pelo cliente em produção (quickstart §pré-requisitos)

---

## Phase 7: Polish & Cross-Cutting

- [ ] T014 [P] Atualizar `docs/design-system.md` com a seção do **Checkout** (fluxo numa página, resumo com frete "a combinar", endereço/CPF/método, tela de sucesso)
- [ ] T015 Gates finais: `npm run lint` (zero erros), `npm run test` (suíte + novos verdes), `npm run build` (bundle íntegro)
- [ ] T016 Regressão do quickstart (§1–4): carrinho, vitrine, admin (marcar pago conta receita agora), conta (007) e variações (008) intactos — **validação manual do usuário**

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (T001)** → **Foundational (T002–T005)** bloqueiam as stories.
- **T003 (refactor)** é o núcleo — antes de qualquer UI; T002/T004/T005 em paralelo.
- **US1 (Phase 3)**: T006 depois de T002–T005; T007/T008 depois de T006; T009 por último. **US2/US3** ajustam o mesmo `useCheckout`/`Checkout` (T010/T011) — depois de T007.
- **Rules (T012)** acompanha a US1; **T013 (deploy)** é manual, depende de T012.
- **Polish**: depois das stories.

### Ordem recomendada (MVP-first)
Setup → Foundational (T003 refactor primeiro) → **US1** (checkout ponta a ponta) → US2 (revisão) → US3 (endereço/CPF) → Rules + **[T013 deploy manual]** → Polish.

### Parallel Opportunities
- Foundational: T002 ∥ T004 ∥ T005 (T003 é sequencial e crítico).
- Polish: T014 ∥ (T015 depois).

## Notes
- **Refactor do `orderService`** é a tarefa mais delicada (toca estoque + agregados + cancelamento): fazer e testar (T003) **antes** da UI. O M4b liga o webhook à transição `pago` sem reescrever a criação.
- **Sem backend**; pagamento é `paymentProvider` (stub). Dívida de segurança da criação client-side documentada e datada para o M4b (research R-3).
- **Passo manual do usuário**: **T013** deploy das rules (auditado no Playground) antes de a criação de pedido funcionar em produção.
