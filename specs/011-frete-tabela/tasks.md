# Tasks: Frete por Tabela (M5a)

**Input**: Design documents from `/specs/011-frete-tabela/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.md, contracts/ui.md, quickstart.md, research.md

**Tests**: INCLUÍDOS — toca o total do pedido (Princípio II): matching CEP/valor, frete grátis, CEP sem regra, validação da tabela, congelamento no pedido e o recálculo no checkout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US3 — mapeia para as user stories da spec.md
- Caminhos exatos incluídos

---

## Phase 1: Setup

- [ ] T001 [P] Adicionar `ADMIN_SHIPPING: "/admin/frete"` em `frontend/src/constants/routes.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: regra de cálculo + config + interface bloqueiam admin e checkout

- [ ] T002 [P] Criar `frontend/src/utils/shipping.js` (contracts/services.md): `cepToNumber`, `matchRule`, `computeShipping` (frete grátis prevalece → regra → defaultRule → `sem_regra`) e `validateShippingSettings` (faixas 8 dígitos/from≤to, valor/prazo ≥ 0, sem sobreposição) — testes em `frontend/src/utils/__tests__/shipping.test.js` (grátis; regra por região; faixa de valor; default; sem_regra; validação)
- [ ] T003 [P] Estender `frontend/src/services/settingsService.js`: `getShippingSettings()` / `updateShippingSettings(changes)` no doc `settings/shipping` (default vazio se ausente)
- [ ] T004 Criar `frontend/src/services/shippingProvider.js`: `quote({ cep, subtotal })` que lê `getShippingSettings` + `computeShipping` → `{ ok, options:[{method,price,etaDays,free}] }` ou `{ ok:false, error }` (interface p/ o M5b) — teste em `frontend/src/services/__tests__/shippingProvider.test.js`
- [ ] T005 [P] Criar `frontend/src/hooks/useShippingSettings.js`: leitura da config com cache de módulo (para banner e, se útil, checkout)

**Checkpoint**: cálculo de frete, config e interface prontos e testados

---

## Phase 3: User Story 1 - Lojista configura a tabela (Priority: P1) 🎯 MVP

**Goal**: tela de frete no admin com regras (região/CEP/valor/prazo), frete padrão e limite grátis, validados e persistidos.

**Independent Test**: quickstart §1 — cadastrar regras + padrão + limite, ser bloqueado por faixa malformada/sobreposta, salvar e ver persistido.

- [ ] T006 [US1] Criar `frontend/src/pages/Admin/Shipping/index.jsx` + `styles.module.css`: editor de regras (região, faixas de CEP com máscara, valor, prazo, faixa de valor opcional), frete padrão "demais regiões", limite de frete grátis; salvar valida via `validateShippingSettings` (erros campo a campo) e grava via `updateShippingSettings`; estados carregando/salvando/erro
- [ ] T007 [US1] Registrar a rota `/admin/frete` sob `AdminRoute` em `frontend/src/routes/index.jsx` e adicionar o item **"Frete"** ao `NAV_ITEMS` do `frontend/src/layouts/AdminLayout/index.jsx`

**Checkpoint**: lojista configura e salva a tabela de frete

---

## Phase 4: User Story 2 - Cliente vê o frete calculado no checkout (Priority: P1)

**Goal**: checkout calcula o frete pelo CEP, mostra valor+prazo, total = subtotal + frete; frete grátis; bloqueia CEP sem regra; congela no pedido.

**Independent Test**: quickstart §2 — CEP do Sudeste mostra o frete/prazo; ≥ limite → grátis; sem regra sem padrão → bloqueia; confirmar grava o frete congelado.

- [ ] T008 [US2] Estender `frontend/src/hooks/useCheckout.js`: usar o **CEP do endereço selecionado** (`address.cep`; ViaCEP não é re-chamado — já validado no M3); chamar `shippingProvider.quote({ cep, subtotal })` ao montar e ao mudar endereço/subtotal; expor `shipping`/`shippingEtaDays`/`shippingMethod`/`shippingError` e `total = subtotal + (shipping||0)`. **Comportamento (C1 do analyze):** frete calculado/grátis → mostra e permite confirmar; **`sem_regra`** (config existe mas CEP não coberto e sem padrão) → **bloqueia** com aviso; **`sem_config`** (loja sem tabela) → mantém "a combinar" e **permite** confirmar (fallback M4a, `shipping: null`). — testes em `frontend/src/hooks/__tests__/useCheckout.test.jsx` (recalcula ao trocar endereço; grátis ≥ limite; sem_regra bloqueia; sem_config permite "a combinar"; total)
- [ ] T009 [US2] Atualizar `frontend/src/pages/Checkout/index.jsx`: linha de frete no resumo com **valor + prazo** (ou "Frete grátis"/"Calculando…"), o CEP editável/derivado do endereço, e o aviso de bloqueio ("ainda não entregamos nessa região"/CEP inválido)
- [ ] T010 [US2] Estender `frontend/src/services/orderService.js` `createOrder`: aceitar/gravar `shipping` (valor calculado) + `shippingEtaDays` + `shippingMethod` + `shippingCep`, e `shippingStatus` "calculado"/"gratis"; `total = subtotal + (shipping||0)` — estender `frontend/src/services/__tests__/orderService.test.js` (grava frete e etaDays/method/cep; total = subtotal + shipping; frete 0 → status "gratis")
- [ ] T011 [US2] Exibir o frete/prazo no detalhe de "Meus pedidos" `frontend/src/pages/Account/Orders/Detail/index.jsx` (substitui o "A combinar" quando o frete está calculado; mostra o prazo)

**Checkpoint**: cliente vê e paga com o frete correto; pedido congela o frete

---

## Phase 5: User Story 3 - Banner conectado ao limite (Priority: P3)

- [ ] T012 [US3] Ajustar `frontend/src/components/TopBar/index.jsx` para ler `freeShippingThreshold` via `useShippingSettings` e exibir "Frete grátis acima de R$X" (oculta/genérico sem limite)

**Checkpoint**: banner reflete o limite real configurado

---

## Phase 6: Polish & Cross-Cutting

- [ ] T013 [P] Atualizar `docs/design-system.md` com a seção **Frete** (tela do admin; linha de frete no checkout com valor+prazo; banner conectado ao limite)
- [ ] T014 Gates finais: `npm run lint` (zero erros), `npm run test` (suíte + novos verdes), `npm run build` (bundle íntegro)
- [ ] T015 Regressão do quickstart (§1–5): checkout (009), carrinho, conta (007), variações (008), admin e vitrine intactos — **validação manual do usuário**

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (T001)** → **Foundational (T002–T005)** bloqueiam as stories.
- **T002 (util de cálculo)** é o núcleo; T003/T004/T005 dependem dele/em paralelo.
- **US1 (Phase 3)**: T006 depois de T002/T003; T007 por último.
- **US2 (Phase 4)**: T008 depois de T004; T009 depois de T008; T010 (service) ∥ T008; T011 depois de T010.
- **US3 (Phase 5)**: T012 depois de T005/T003.
- **Polish**: depois das stories.

### Ordem recomendada (MVP-first)
Setup → Foundational (T002 primeiro) → **US1** (admin configura) → **US2** (checkout calcula + pedido congela) → US3 (banner) → Polish.

### Parallel Opportunities
- Foundational: T002 primeiro; T003 ∥ T005; T004 depois de T002/T003.
- US2: T010 ∥ T008.

## Notes
- **Sem backend**; cálculo atrás de `shippingProvider` (tabela) — o M5b troca pela API real sem reescrever o checkout.
- **Sem mudança de rules** (`settings/{id}` já cobre) e **sem novos índices**.
- **Sem peso** na M5a (decisão do clarify) — peso é M5b.
- Frete **congelado** no pedido; alterar a tabela não muda pedidos existentes.
