# Tasks: Avaliações de Produtos (015)

**Input**: Design documents from `/specs/015-avaliacoes-produtos/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.md, contracts/ui.md, quickstart.md, research.md

**Tests**: INCLUÍDOS — toca a **média exibida e a moderação** (Princípio II): cálculo da média (só aprovadas, arredondamento), validação, recompute na aprovação/ocultação/remoção, elegibilidade "comprou".

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US3 — mapeia para as user stories da spec.md
- Caminhos exatos incluídos

---

## Phase 1: Setup

- [ ] T001 [P] Adicionar `ADMIN_REVIEWS: "/admin/avaliacoes"` em `frontend/src/constants/routes.js` e criar `frontend/src/constants/review.js` (`REVIEW_STATUS` pendente/aprovada/oculta, `REVIEW_STATUS_LABELS`, `COMMENT_MAX`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: util de média/validação + service + componente de estrelas + regra/índices bloqueiam página, admin e vitrine

- [ ] T002 [P] Criar `frontend/src/utils/rating.js` (contracts/services.md): `averageOf`, `roundHalf`, `starBreakdown`, `validateReview` — testes em `frontend/src/utils/__tests__/rating.test.js` (vazio→0; arredondamento 1 casa; full/half/empty; rating fora de 1–5; comentário acima do limite; ok)
- [ ] T003 Criar `frontend/src/services/reviewService.js` (contracts/services.md): `submitReview` (id `productId_uid`, status pendente, updatedAt), `getMyReview`, `getApprovedReviews` (limit+cursor), `hasPurchased` (orders array-contains, ignora cancelado), admin `listReviews`/`approveReview`/`hideReview`/`deleteReview` + `recomputeProductRating` (média das aprovadas → produto) — teste em `frontend/src/services/__tests__/reviewService.test.js` (submit grava id+pendente; get; aprovar/ocultar/remover chamam recompute e atualizam ratingAvg/ratingCount só com aprovadas; hasPurchased true/false; paginação) — Firestore mockado
- [ ] T004 [P] Criar `frontend/src/components/StarRating/index.jsx` + `styles.module.css` (contracts/ui.md): 5 estrelas (cheia/meia/vazia via `starBreakdown`) + contagem opcional; estado neutro sem avaliações; `aria-label`
- [ ] T005 Adicionar o bloco `match /reviews/{reviewId}` em `firestore.rules` (research R-5): leitura só aprovadas/própria/admin; create próprio como `pendente` com id `productId_uid` e nota 1–5; update admin **ou** próprio→pendente; delete admin. **Deploy manual.**
- [ ] T006 [P] Adicionar 2 índices em `firestore.indexes.json`: `reviews` (productId ASC, status ASC, createdAt DESC) e `orders` (customerId ASC, productIds ARRAY_CONTAINS). **Deploy manual.**

**Checkpoint**: cálculo, acesso a dados, estrelas, regra e índices prontos e testados

---

## Phase 3: User Story 1 - Cliente avalia (Priority: P1) 🎯 MVP

**Goal**: quem comprou avalia (nota + comentário) na página do produto; uma por produto (editável, volta a pendente); vê a própria e a lista de aprovadas.

**Independent Test**: quickstart §1 — cliente que comprou dá 4★ + comentário → pendente; edita para 5★ → volta a pendente; sem nota bloqueia; quem não comprou/deslogado não vê o form.

- [ ] T007 [US1] Criar `frontend/src/hooks/useProductReviews.js` (contracts/services.md): carrega aprovadas (paginado), `myReview`, elegibilidade (`hasPurchased` + logado), `submit`/`loadMore`; `canReview` = logado && comprou && (sem review ou editando a própria) — testes em `frontend/src/hooks/__tests__/useProductReviews.test.jsx` (canReview por elegibilidade; submit revalida a própria; não elegível não permite)
- [ ] T008 [US1] Adicionar a seção **"Avaliações"** em `frontend/src/pages/Product/index.jsx` (+ styles): resumo (média + contagem via `StarRating`), **formulário** (estrelas clicáveis 1–5 + textarea com limite `COMMENT_MAX` + enviar; estados enviando/erro/enviado; preenchido se já avaliou; aviso "volta a análise" ao editar aprovada), **gating** (deslogado → entrar; logado sem compra → "só quem comprou"; elegível → form), e a **lista** de aprovadas (estrelas, comentário, nome, data) com **"Ver mais"**; a própria pendente com selo "Em análise"

**Checkpoint**: cliente elegível avalia/edita e vê a lista de aprovadas

---

## Phase 4: User Story 2 - Lojista modera (Priority: P1)

**Goal**: tela de moderação com pendentes (contador), aprovar/ocultar/remover; a média do produto recalcula na moderação.

**Independent Test**: quickstart §2 — aprovar uma pendente → média sobe; ocultar/remover uma aprovada → média recalcula.

- [ ] T009 [US2] Criar `frontend/src/pages/Admin/Reviews/index.jsx` + `styles.module.css` (contracts/ui.md): filtro por status (pendentes/aprovadas/ocultas) com **contador de pendentes**; lista (produto, nota via estrelas, comentário, autor, data, status) + ações **Aprovar/Ocultar/Remover** (confirm na remoção) via `reviewService` (recompute embutido); estados carregando/vazio + `useFeedback`
- [ ] T010 [US2] Registrar a rota `/admin/avaliacoes` (lazy) sob `AdminRoute` em `frontend/src/routes/index.jsx` e adicionar o item **"Avaliações"** ao `NAV_ITEMS` do `frontend/src/layouts/AdminLayout/index.jsx` (ícone de estrela, perto de Cupons)

**Checkpoint**: lojista modera e a média reflete só as aprovadas

---

## Phase 5: User Story 3 - Média na vitrine (Priority: P2)

**Goal**: o card da vitrine mostra a média denormalizada + contagem.

**Independent Test**: quickstart §3.2 — um produto com avaliações aprovadas mostra estrelas + contagem no card; sem avaliações, estado neutro.

- [ ] T011 [US3] Adicionar `StarRating` ao `frontend/src/components/ProductCard/index.jsx` com `avg = product.ratingAvg ?? 0`, `count = product.ratingCount ?? 0` (size sm, contagem); sem avaliações não polui o card

**Checkpoint**: prova social visível já na navegação

---

## Phase 6: Polish & Cross-Cutting

- [ ] T012 [P] Atualizar `docs/design-system.md` com a seção **Avaliações** (estrelas no card/página; formulário com gating comprou/logado e limite; re-moderação ao editar; tela de moderação do admin)
- [ ] T013 Gates finais: `npm run lint` (zero erros), `npm run test` (suíte + novos verdes), `npm run build` (bundle íntegro)
- [ ] T014 Regressão do quickstart (§1–4): vitrine, produto, checkout (009), frete (011), cupons (013), lista de desejos (014), carrinho, conta, admin intactos — **validação manual do usuário** (após deploy de rules + índices)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (T001)** → **Foundational (T002–T006)** bloqueiam as stories.
- **T002 (util)** e **T003 (service)** são o núcleo; **T004 (StarRating)** depende de T002.
- **US1 (Phase 3)**: T007 depois de T003; T008 depois de T007 + T004.
- **US2 (Phase 4)**: T009 depois de T003/T004; T010 por último.
- **US3 (Phase 5)**: T011 depois de T004.
- **Polish**: depois das stories.

### Ordem recomendada (MVP-first)
Setup → Foundational (T002/T003 primeiro) → **US1** (cliente avalia) → **US2** (admin modera) → US3 (vitrine) → Polish.

### Parallel Opportunities
- Foundational: T002 ∥ T006; T004 depois de T002; T003 sozinho; T005 ∥ T006.
- US2 e US3 podem andar em paralelo após o Foundational (arquivos diferentes).

## Notes
- **Sem backend**; agregado do produto é **escrita admin** (`recomputeProductRating`) — cliente não forja. `products` sem mudança de regra.
- **Regra nova** `match /reviews/{id}` + **2 índices** — **deploy manual** (`firebase deploy --only firestore:rules,firestore:indexes`).
- Compra verificada é checagem **client-side** (forjável) — endurecida no M4b.
- Uma avaliação por (produto, cliente) via id determinístico; editar volta a **pendente**.
