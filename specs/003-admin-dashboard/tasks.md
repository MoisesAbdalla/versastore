# Tasks: Dashboard Administrativa do E-commerce

**Input**: Design documents from `/specs/003-admin-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/services.md,
contracts/firestore.md, quickstart.md

**Tests**: INCLUÍDOS — a constituição (Princípio II) torna testes NON-NEGOTIABLE para lógica de
dinheiro/estoque/auth, e o pedido do usuário exige teste em todo service e fluxo crítico.

**Organization**: Tarefas agrupadas por user story (US1–US7 da spec), com fases de Setup e
Foundational antes e Polish ao final.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US7 — mapeia para as user stories da spec.md
- Caminhos exatos incluídos em cada tarefa

---

## Phase 1: Setup

**Purpose**: Limpeza e blocos compartilhados sem dependências

- [x] T001 [P] Remover as 2 dependências instaladas por engano na raiz (`@mui/icons-material`, `react-router-dom`) de `package.json`, `package-lock.json` e `node_modules/` da raiz — manter tudo somente em `frontend/`
- [x] T002 [P] Remover a pasta vazia `frontend/src/context/` (consolidação em `frontend/src/contexts/` — plan.md)
- [x] T003 [P] Criar constantes de domínio: `frontend/src/constants/orderStatus.js` (7 status + mapa de transições válidas do data-model.md), `frontend/src/constants/roles.js` (papéis → capacidades, FR-003) e `frontend/src/constants/product.js` (status de produto, formatos/tamanho máximo de upload)
- [x] T004 [P] Criar `frontend/src/utils/format.js` (`formatBRL(cents)`, `formatDate`, `formatDateTime`, `formatPct` via `Intl` pt-BR) com testes em `frontend/src/utils/__tests__/format.test.js`
- [x] T005 [P] Criar `frontend/src/utils/slugify.js` com testes em `frontend/src/utils/__tests__/slugify.test.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura que TODAS as user stories consomem

**⚠️ CRITICAL**: Nenhuma user story começa antes desta fase terminar

- [x] T006 Criar arquivos versionados do Firebase na raiz: `firebase.json` (apontando rules/indexes), `firestore.rules` **v1 escalonada** (deny by default nas coleções administrativas — `orders`, `users`, `dailyStats`, `counters` — com papel via `users/{uid}.role`, anti-escalação de `role`/`orderCount`/`totalSpent` e restrição de campos de update em `orders`; **`products` e `categories` mantêm leitura pública irrestrita** para não quebrar a loja atual — o aperto para `status == "ativo" && deleted == false` acontece só em T030a, após backfill e migração da loja) e `firestore.indexes.json` (os 16 índices compostos da tabela de contracts/firestore.md)
- [x] T007 Deploy das regras v1 e índices: `npx firebase-tools deploy --only firestore:rules,firestore:indexes` e confirmação no console (índices em build podem demorar; depende de T006)
- [x] T008 [P] Criar `frontend/src/contexts/FeedbackContext.jsx` (toasts de sucesso/erro com MUI Snackbar+Alert, hook `useFeedback`) e registrar o provider em `frontend/src/main.jsx`
- [x] T009 [P] Criar `frontend/src/components/ConfirmDialog/index.jsx` + `styles.module.css` (confirmação de ações destrutivas, FR-083; fecha com Esc)
- [x] T010 [P] Criar `frontend/src/components/EmptyState/index.jsx` + `styles.module.css` (estado vazio com orientação de próximo passo, FR-084)
- [x] T011 [P] Criar `frontend/src/hooks/useListState.js` (filtros/busca/ordenação/página/cursor ↔ query params da URL, research R-6) com testes em `frontend/src/hooks/__tests__/useListState.test.js`
- [x] T012 [P] Criar `frontend/src/hooks/usePagination.js` (pilha de cursores `startAfter` + `limit(20)`, next/prev/refresh) com testes em `frontend/src/hooks/__tests__/usePagination.test.js`
- [x] T013 Criar `frontend/src/components/DataTable/index.jsx` + `styles.module.css` (tabela com skeleton de carregamento, ordenação por coluna restrita às indexadas, seleção em massa, paginação por cursor, estado vazio via EmptyState) — depende de T009–T012

**Checkpoint**: Fundação pronta — user stories podem começar (em paralelo, se houver equipe)

---

## Phase 3: User Story 1 - Acesso restrito ao painel (Priority: P1) 🎯 MVP

**Goal**: Só admins acessam o painel (cliente e camada de dados); layout base com sidebar + header

**Independent Test**: quickstart.md §0–1 — admin abre `/admin`; customer é redirecionado com
mensagem; anônimo vai ao login; leitura/escrita direta negada pelas rules; escalação de `role`
negada

- [x] T014 [P] [US1] Criar `frontend/src/services/userService.js` (`getUserProfile(uid)`, `hasPermission(role, capability)` contra `constants/roles.js`) com testes em `frontend/src/services/__tests__/userService.test.js`
- [x] T015 [US1] Estender `frontend/src/contexts/AuthContext.jsx`: após `onAuthStateChanged`, carregar perfil via `userService` e expor `{ user, role, isAdmin, loading }` mantendo a API atual (`user`, `setUser`) — NÃO criar novo contexto
- [x] T016 [P] [US1] Criar `frontend/src/pages/Admin/AccessDenied/index.jsx` + `styles.module.css` (mensagem clara em pt-BR + link de volta à loja)
- [x] T017 [US1] Implementar `frontend/src/routes/PrivateRoute.jsx` (arquivo existe vazio): autenticado renderiza children; anônimo redireciona a `/login`
- [x] T018 [US1] Implementar `frontend/src/routes/AdminRoute.jsx` (arquivo existe vazio): `isAdmin` renderiza; logado não-admin → AccessDenied; anônimo → `/login`; aguarda `loading` do AuthContext — com testes em `frontend/src/routes/__tests__/AdminRoute.test.jsx` (3 cenários)
- [x] T019 [US1] Criar `frontend/src/layouts/AdminLayout/index.jsx` + `styles.module.css`: sidebar fixa com os 6 módulos (drawer em mobile), header com nome do usuário logado e slot de busca global — tokens de `variables.css`/design system (FR-080/081)
- [x] T020 [US1] Estender `frontend/src/routes/index.jsx` e `frontend/src/constants/routes.js`: rotas aninhadas `/admin`, `/admin/products(/new/:id)`, `/admin/categories`, `/admin/orders(/:id)`, `/admin/customers(/:id)`, `/admin/reports` — todas com `React.lazy` (constituição IV), envolvidas por `AdminRoute` + `AdminLayout`; Dashboard placeholder até US5
- [x] T021 [US1] Bootstrap + validação de segurança: promover o primeiro admin no console (quickstart §0) e executar os cenários do Rules Playground do quickstart §1 (leitura negada a customer, escalação de role negada, revogação imediata)

**Checkpoint**: Painel acessível só por admin, protegido também nas rules — MVP validável

---

## Phase 4: User Story 2 - Gestão completa de produtos (Priority: P2)

**Goal**: Listagem com filtros/massa + formulário completo (variações, imagens, promoção, rascunho,
duplicar, soft delete)

**Independent Test**: quickstart.md §2 — cadastrar produto completo < 3 min; validações de
SKU/promoção/publicação; rascunho automático; soft delete; filtros preservados ao voltar

- [x] T022 [P] [US2] Estender `frontend/src/services/cloudinaryService.js`: `uploadImageWithRetry(file, {attempts: 3, onProgress})` com backoff 1s/2s/4s e validação de formato/tamanho antes do envio (R-13) — testes em `frontend/src/services/__tests__/cloudinaryService.test.js` (fetch mockado)
- [x] T023 [US2] Estender `frontend/src/services/productService.js` conforme contracts/services.md: `listProducts` (filtros + cursor + `deleted == false` sempre), `createProduct`/`updateProduct` com derivações (`nameLower`, `skuUpper`, `descriptionText`, `totalStock`, `variationSkus`, `categoryName`, sync de `image` legado) e validações (`sku-duplicado`, `promocao-invalida`, `publicacao-incompleta`), `deleteProduct` soft/hard via consulta `orders.productIds`, `duplicateProduct`, `bulkUpdateProducts`, `bulkDeleteProducts`, `checkSkuAvailable`, normalização de produtos legados na 1ª edição; preços passam a centavos (data-model.md)
- [x] T024 [US2] Testes de `productService` em `frontend/src/services/__tests__/productService.test.js`: SKU duplicado (produto e variação), publicação incompleta bloqueada, promoção inválida, soft vs. hard delete, filtro `deleted` em toda listagem, derivações corretas — Firestore mockado, determinístico
- [x] T025 [P] [US2] Criar `frontend/src/hooks/useProducts.js` (wrapper de listagem/mutações com loading/error + toasts via FeedbackContext)
- [x] T026 [P] [US2] Criar `frontend/src/components/RichTextField/index.jsx` + `styles.module.css` (negrito/itálico/listas via contentEditable, R-11) com sanitização por allowlist testada em `frontend/src/components/RichTextField/__tests__/sanitize.test.js` (payloads XSS neutralizados)
- [x] T027 [US2] Criar `frontend/src/pages/Admin/Products/List/index.jsx` + `styles.module.css`: DataTable com colunas da spec, busca por prefixo nome/SKU, filtros categoria/status/faixa de estoque, ordenação indexada, ações em massa com ConfirmDialog, estado na URL (useListState)
- [x] T028 [US2] Criar `frontend/src/pages/Admin/Products/Form/index.jsx` + `styles.module.css`: seções (básico, imagens, preço/promoção, estoque, variações, status), upload múltiplo com arrastar-e-soltar/reordenação/imagem principal (estado por imagem + tentar novamente), variações com SKU/estoque/preço opcional, alerta de estoque baixo configurável, rascunho automático em localStorage com debounce e oferta de restauração (R-12), ação duplicar
- [x] T029 [US2] Absorver telas antigas: remover o formulário de `frontend/src/pages/Admin/index.jsx` e as telas `frontend/src/pages/Admin/ProductList/` e `frontend/src/pages/Admin/ProductEdit/` (feature 002), redirecionando as rotas antigas para as novas sem quebrar links
- [ ] T029a [US2] Criar e executar script one-time de backfill `frontend/src/dev/backfillProducts.js` (rodado por admin autenticado): para cada produto legado, gravar `deleted: false`, `status: "ativo"`, `nameLower`, `totalStock = stock`, `images[]` derivado do campo `image` legado e **preço convertido para centavos** — conferir no console do Firebase antes de prosseguir (resolve C2/C3 da análise; produtos sem o campo `deleted` não casam com `where("deleted","==",false)`)
- [x] T030 [US2] Compatibilidade da loja (SOMENTE após T029a): `getFeaturedProducts`/`getProducts` passam a filtrar `deleted == false` e a loja lê preço em centavos via `formatBRL` — sem mudança visual na Home (validar destaque da feature 002 intacto)
- [ ] T030a [US2] Apertar a rule de leitura pública de `products` para `status == "ativo" && deleted == false` em `firestore.rules` e redeployar (`npx firebase-tools deploy --only firestore:rules`); validar a Home como anônimo após o deploy (conclui o escalonamento iniciado em T006)

**Checkpoint**: Catálogo gerenciável ponta a ponta; loja intacta

---

## Phase 5: User Story 3 - Categorias com subcategorias (Priority: P3)

**Goal**: CRUD de categorias em 2 níveis com proteção contra exclusão com produtos

**Independent Test**: quickstart.md §3 — criar categoria + sub; nível 3 bloqueado; exclusão com
produtos bloqueada com fluxo de mover

- [x] T031 [P] [US3] Criar `frontend/src/services/categoryService.js` conforme contracts/services.md: `listCategories` (árvore montada no cliente), `createCategory`/`updateCategory` (slug único via `slugify`, `hierarquia-invalida` se pai já é subcategoria), `deleteCategory` (`categoria-com-produtos`, `categoria-com-subcategorias`), `moveProducts` (lote atualizando `categoryId`/`categoryName`)
- [x] T032 [US3] Testes de `categoryService` em `frontend/src/services/__tests__/categoryService.test.js`: slug duplicado, limite de 2 níveis, bloqueio de exclusão, moveProducts
- [x] T033 [P] [US3] Criar `frontend/src/hooks/useCategories.js`
- [x] T034 [US3] Criar `frontend/src/pages/Admin/Categories/index.jsx` + `styles.module.css` (lista hierárquica, formulário com imagem opcional via Cloudinary, fluxo "mover produtos antes de excluir" com ConfirmDialog) e trocar o campo de categoria do Form de produto (T028) para select alimentado por `useCategories` gravando `categoryId`/`categoryName`

**Checkpoint**: Catálogo organizado por hierarquia real de categorias

---

## Phase 6: User Story 4 - Gestão de pedidos (Priority: P4)

**Goal**: Ciclo de vida com transições validadas, histórico auditável e estoque transacional

**Independent Test**: quickstart.md §4 — busca < 10 s; transição inválida bloqueada; cancelamento
atômico devolve estoque; preço congelado; teste de concorrência do último item

- [x] T035 [US4] Criar `frontend/src/services/orderService.js` conforme contracts/services.md — todas as mutações em `runTransaction` (R-3): `createOrder` (valida estoque por item/variação → decrementa → incrementa `counters/orders` → grava pedido com itens congelados + `productIds` → atualiza `dailyStats/{hoje}` → agrega `orderCount`/`totalSpent` do cliente), `advanceStatus` (mapa de `constants/orderStatus.js`), `cancelOrder`/`returnOrder` (motivo obrigatório, devolve estoque + subtrai `dailyStats` + ajusta agregados na MESMA transação), `setTrackingCode`, `setInternalNotes`, `listOrders` (filtros/busca/cursor)
- [x] T036 [US4] Testes de `orderService` em `frontend/src/services/__tests__/orderService.test.js`: 2 `createOrder` simultâneos do último item → 1 sucesso + 1 `estoque-insuficiente` e estoque final 0 (SC-006); transição inválida bloqueada; cancelamento atômico (estoque + histórico + dailyStats juntos, SC-009); preço congelado após alteração do produto (SC-007); motivo obrigatório; histórico com autor/data (SC-008). Nota: com Firestore mockado o teste valida a lógica de validação/aborto — a semântica real de retry do `runTransaction` exige emulador (registrado como melhoria futura, como já feito para as rules)
- [x] T037 [P] [US4] Criar `frontend/src/hooks/useOrders.js`
- [x] T038 [P] [US4] Criar utilitário de seed de desenvolvimento `frontend/src/dev/seedOrders.js` (gera clientes/pedidos de exemplo via `orderService.createOrder`, respeitando baixa de estoque — insumo do quickstart; não referenciado em código de produção)
- [x] T039 [US4] Criar `frontend/src/pages/Admin/Orders/List/index.jsx` + `styles.module.css`: DataTable com colunas da spec, filtros status/período/cliente, busca por nº exato ou prefixo de nome, estado na URL
- [x] T040 [US4] Criar `frontend/src/pages/Admin/Orders/Detail/index.jsx` + `styles.module.css`: dados do cliente, endereço, itens congelados, timeline do histórico, ações avançar status / cancelar com motivo (ConfirmDialog) / devolver, campos rastreio e notas internas

**Checkpoint**: Operação de pedidos completa e auditável

---

## Phase 7: User Story 5 - Visão geral do negócio (Priority: P5)

**Goal**: Home do painel com indicadores, gráfico, top-5, recentes e alertas — sem varrer `orders`

**Independent Test**: quickstart.md §5 — cards com deltas, gráfico por período, alertas acionáveis;
Network sem leitura da coleção `orders` inteira; < 2 s (SC-003)

- [x] T041 [US5] Criar `frontend/src/services/dashboardService.js` conforme contracts/services.md: `getOverviewStats` (hoje/7 dias/mês com delta vs. período anterior equivalente), `getSalesSeries` (1 range query em `dailyStats` por ID de documento), `getTopProducts` (merge client-side de `unitsByProduct`), `getRecentOrders(limit 5)`, `getAlerts` (estoque baixo/zerado via `totalStock`, pedidos pagos sem envio, produtos sem foto/descrição incompleta — cada um com `limit`)
- [x] T042 [US5] Testes de `dashboardService` em `frontend/src/services/__tests__/dashboardService.test.js`: cálculo de deltas percentuais (incluindo período anterior zerado), merge de `unitsByProduct`, limites de período
- [x] T043 [P] [US5] Criar `frontend/src/components/StatCard/index.jsx` + `styles.module.css` (valor, rótulo, delta % com cor semântica do design system)
- [x] T044 [P] [US5] Criar `frontend/src/components/SalesChart/index.jsx` + `styles.module.css` (SVG próprio responsivo por viewBox, série de `dailyStats`, acessível: role img + descrição textual — R-10)
- [x] T045 [P] [US5] Criar `frontend/src/hooks/useDashboard.js` (período selecionado → stats/series/top/recentes/alertas com loading/error)
- [x] T046 [US5] Criar `frontend/src/pages/Admin/Dashboard/index.jsx` + `styles.module.css` substituindo o placeholder de T020: grid de StatCards, SalesChart com seletor de período (7/30/90 dias, 12 meses, personalizado), top-5, pedidos recentes com atalho, painel de alertas com links de resolução (FR-010..015)

**Checkpoint**: Visão geral operacional em < 2 s com dados agregados

---

## Phase 8: User Story 6 - Consulta de clientes (Priority: P6)

**Goal**: Listagem com totais agregados e detalhe com histórico/endereços

**Independent Test**: quickstart.md §6 — listagem com totais, busca nome/e-mail, detalhe com
pedidos; cancelamento ajusta totais

- [x] T047 [P] [US6] Criar `frontend/src/services/customerService.js` conforme contracts/services.md: `listCustomers` (`role == "customer"`, busca prefixo/e-mail exato, ordenações indexadas), `getCustomer`, `getCustomerOrders` (cursor)
- [x] T048 [US6] Testes de `customerService` em `frontend/src/services/__tests__/customerService.test.js`: filtro de papel, busca, paginação
- [x] T049 [P] [US6] Criar `frontend/src/hooks/useCustomers.js`
- [x] T050 [US6] Criar `frontend/src/pages/Admin/Customers/List/index.jsx` e `frontend/src/pages/Admin/Customers/Detail/index.jsx` (+ `styles.module.css`): listagem com totais em R$, detalhe com histórico de pedidos (atalhos) e endereços

**Checkpoint**: Módulo de clientes consultável

---

## Phase 9: User Story 7 - Relatórios e exportação CSV (Priority: P7)

**Goal**: Relatórios de vendas/produtos por período e CSV em todas as listagens

**Independent Test**: quickstart.md §7 — agrupamento dia/semana/mês bate com `dailyStats`; CSV abre
no Excel pt-BR com acentos e colunas corretos e reflete exatamente os filtros (SC-010)

- [ ] T051 [P] [US7] Criar `frontend/src/utils/csv.js` (`exportCsv({headers, rows, filename})` — BOM UTF-8, separador `;`, escape de aspas, teto 5.000 linhas, R-9) com testes em `frontend/src/utils/__tests__/csv.test.js` (saída byte a byte)
- [ ] T052 [US7] Criar `frontend/src/pages/Admin/Reports/index.jsx` + `styles.module.css`: relatório de vendas por período com agrupamento dia/semana/mês (consolidação client-side de `dailyStats`), relatório de produtos (mais vendidos, sem vendas no período, estoque atual)
- [ ] T053 [US7] Adicionar exportação CSV às listagens de Products/List, Orders/List, Customers/List e Reports: re-executa a query filtrada sem paginação (com teto) e chama `exportCsv` com cabeçalhos pt-BR

**Checkpoint**: Todas as user stories completas

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T054 Implementar busca global no header do AdminLayout (`frontend/src/layouts/AdminLayout/`): produtos e pedidos por prefixo/nº com atalho para o detalhe (FR-080)
- [ ] T055 [P] Atualizar `docs/design-system.md` no mesmo PR com os novos padrões do painel (DataTable, sidebar/AdminLayout, StatCard, SalesChart, toasts, ConfirmDialog, EmptyState) — constituição, Princípio III
- [ ] T056 Auditoria responsiva: todos os fluxos do quickstart em viewport 375px (sidebar → drawer, tabelas com scroll próprio, formulários utilizáveis) — SC-004
- [ ] T057 Auditoria de acessibilidade: navegação por teclado nos fluxos principais, Esc fecha diálogos, contraste dos tokens, `aria-label` em ações de ícone (FR-086)
- [ ] T058 Gates finais: `npm run lint` (zero erros), `npm run test` (suíte completa verde), `npm run build` comparando o bundle inicial da loja com o baseline (rotas `/admin/*` em chunks lazy — constituição IV)
- [ ] T059 Executar a validação completa do quickstart.md (§0–8), incluindo regressão da loja (Home/produtos/login inalterados, destaque da feature 002 funcionando)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende de Setup (T003–T005 usados por rules/DataTable); **bloqueia todas as user stories**; T007 depende de T006
- **US1 (Phase 3)**: depende de Foundational (rules v1 deployadas em T007 são pré-requisito de T021)
- **US2 (Phase 4)**: depende de Foundational + T020 (rotas). Ordem obrigatória no fim da fase: T029 → **T029a (backfill) → T030 (loja) → T030a (aperto das rules)** — inverter essa ordem quebra a Home
- **US3 (Phase 5)**: depende de Foundational + T028 (integração do select no Form)
- **US4 (Phase 6)**: depende de Foundational; consome produtos reais (US2) para seed, mas o service é testável com mocks independentemente
- **US5 (Phase 7)**: depende de Foundational; `dailyStats` é alimentado por US4 — para teste independente, semear via T038
- **US6 (Phase 8)**: depende de Foundational; agregados de cliente vêm das transações de US4
- **US7 (Phase 9)**: depende das listagens existirem (US2/US4/US6) para T053; T051/T052 só de Foundational
- **Polish (Phase 10)**: depende de todas as stories desejadas

### User Story Dependencies (dados, não código)

```text
US1 (P1) ──┬─→ US2 (P2) ──→ US3 (P3)
           ├─→ US4 (P4) ──→ US5 (P5), US6 (P6)
           └─→ US7 (P7) ← listagens de US2/US4/US6
```

Cada story permanece **independentemente testável** com dados semeados (T038) ou mocks.

### Parallel Opportunities

- Phase 1: T001–T005 todos em paralelo
- Phase 2: T008–T012 em paralelo após T006; T013 por último
- US1: T014 ∥ T016 no início da fase
- US2: T022 ∥ T025 ∥ T026 enquanto T023/T024 avançam
- US5: T043 ∥ T044 ∥ T045 após T041
- Entre stories: com fundação pronta, US2 e US4 podem andar em paralelo (services e telas distintos); US5/US6 após US4; US3 após T028

## Parallel Example: User Story 2

```text
# Após Foundational + T020, disparar em paralelo:
Task: T022 cloudinaryService retry (frontend/src/services/cloudinaryService.js)
Task: T025 hook useProducts (frontend/src/hooks/useProducts.js)
Task: T026 RichTextField (frontend/src/components/RichTextField/)
# Em sequência no mesmo domínio:
Task: T023 → T024 productService + testes
Task: T027 → T028 → T029 → T030 telas e migração
```

## Implementation Strategy

### MVP First (US1)

1. Phases 1–2 (setup + fundação, incluindo deploy de rules/índices)
2. Phase 3 (US1): painel protegido com layout base
3. **PARAR e VALIDAR**: quickstart §0–1 (acesso, rules, escalação) — MVP demonstrável

### Incremental Delivery

Cada checkpoint é um incremento demonstrável: US1 (painel seguro) → US2 (catálogo) → US3
(categorias) → US4 (pedidos) → US5 (visão geral) → US6 (clientes) → US7 (relatórios/CSV) → Polish.
A loja permanece intacta em todos os incrementos (T030 e T059 verificam regressão).

## Notes

- Preços em **centavos** a partir de T023 — T030 cobre a compatibilidade da loja na mesma fase
- Nenhuma dependência nova em nenhum momento (gráfico SVG, editor e CSV próprios — research R-9/10/11)
- Toda mutação de estoque/status SOMENTE via transação no `orderService` (R-3)
- Commit após cada tarefa ou grupo lógico; parar em qualquer checkpoint para validar a story
