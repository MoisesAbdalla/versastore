# Tasks: Vitrine Completa (Catálogo, Produto e Busca)

**Input**: Design documents from `/specs/005-vitrine-completa/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/services.md,
contracts/firestore.md, quickstart.md

**Tests**: INCLUÍDOS — SC-008 exige a suíte existente verde + novos testes da vitrine; a constituição
(Princípio II) torna NON-NEGOTIABLE testar vigência de promoção, disponibilidade de variação,
inacessibilidade de produto inativo, normalizador de busca e o `CartContext`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US5 — mapeia para as user stories da spec.md
- Caminhos exatos incluídos em cada tarefa

---

## Phase 1: Setup (utilitários compartilhados, sem dependência)

- [ ] T001 [P] Estender `frontend/src/services/cloudinaryService.js`: `cloudinaryUrl(url, {w, extra})` (insere `f_auto,q_auto,w_{w}` após `/upload/`; URL não-Cloudinary retorna inalterada) e const `IMAGE_WIDTHS = {card:400, thumb:120, main:800, zoom:1600}` (R-5) — testes em `frontend/src/services/__tests__/cloudinaryService.test.js` (injeção na posição certa + passthrough)
- [ ] T002 [P] Criar `frontend/src/utils/promo.js`: `isPromoActive(product, now)` e `effectivePrice(product, now)` avaliando a vigência no fuso **America/Sao_Paulo** (R-4; sem datas = sempre vigente) — testes em `frontend/src/utils/__tests__/promo.test.js` (vigente/expirada/futura/sem-datas + **fuso**: relógio simulado fora de Brasília dá o mesmo resultado, SC-003)
- [ ] T003 [P] Criar `frontend/src/utils/searchKeywords.js`: `buildSearchKeywords(name, sku, categoryName)` (tokens + prefixos ≥3 normalizados, sem duplicatas, idempotente) e `normalizeQueryTerm(term)`, reusando `normalizeForSearch` de `utils/slugify.js` (R-2) — testes em `frontend/src/utils/__tests__/searchKeywords.test.js` (prefixos, nome+SKU+categoria, acento/caixa, idempotência, term casa com keyword — SC-006)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: bloqueia todas as user stories

- [ ] T004 Auditoria de segurança (FR-015 / SC-008) **antes de codar**: no Rules Playground do console, confirmar que anônimo lê produto ativo, é **negado** em produto inativo, e não grava `searchKeywords`; confirmar `git diff firestore.rules` vazio (contracts/firestore.md §Auditoria)
- [ ] T005 Estender `frontend/src/services/productService.js` com leituras **públicas** (contracts/services.md): `listPublicProducts({categoryId, sort, search, cursor, pageSize})` sempre com `deleted==false` **e** `status=="ativo"` (busca via `array-contains` em `searchKeywords`; ordenação recentes/preço↑↓/nome↑↓; durante busca, ordena por createdAt) e `getPublicProduct(id)` mapeando inativo/inexistente/`permission-denied` → `null` — testes em `frontend/src/services/__tests__/productService.test.js` (público sempre filtra ativo+não-excluído; getPublicProduct → null em inativo/negado — SC-002)
- [ ] T006 [P] Criar `frontend/src/components/PriceTag/index.jsx` + `styles.module.css`: preço normal, e quando `isPromoActive` (promo.js) preço riscado + promocional em destaque + % desconto (usado por card e página) — testes em `frontend/src/components/PriceTag/__tests__/PriceTag.test.jsx` (promo vigente mostra riscado+promocional+%; fora de vigência só normal — SC-003)

**Checkpoint**: leituras públicas seguras + preço/promoção prontos — as user stories podem começar

---

## Phase 3: User Story 1 - Navegar e filtrar o catálogo (Priority: P1) 🎯 MVP

**Goal**: `/products` com grade de produtos ativos, filtro por categoria, ordenação e paginação por
cursor, estado 100% na URL.

**Independent Test**: quickstart §1 — abrir `/products`, ver a grade, filtrar por categoria, trocar
ordenação, "carregar mais", recarregar a URL restaurando o estado, e ver o estado vazio ao zerar
resultados.

- [ ] T007 [US1] Estender `frontend/src/components/ProductCard/index.jsx`: usar `PriceTag` (promo vigente), badge **"Esgotado"** quando `totalStock == 0` (D1) e imagem via `cloudinaryUrl(..., {w: IMAGE_WIDTHS.card})` — sem quebrar o uso atual na Home (`FeaturedProducts`) — testes em `frontend/src/components/ProductCard/__tests__/ProductCard.test.jsx` (badge Esgotado; imagem transformada; promo)
- [ ] T008 [P] [US1] Criar `frontend/src/components/CategoryFilter/index.jsx` + `styles.module.css` (lista categorias da árvore pública; seleção reflete `?categoria=`) e `frontend/src/components/SortSelect/index.jsx` + `styles.module.css` (recentes/preço↑↓/nome↑↓ ↔ `?ordenar=`)
- [ ] T008a [US1] Ligar os links de categoria do `Navbar` ao catálogo filtrado (C1): `frontend/src/data/navigation.js` e `frontend/src/components/Navbar/index.jsx` hoje apontam para rotas **inexistentes** (`/male`, `/female`, `/accessories`) — trocar por `/products?categoria=<slug>` usando slugs reais das categorias (fonte: coleção `categories`), eliminando os links mortos e unificando o caminho de navegação por categoria
- [ ] T009 [US1] Criar `frontend/src/hooks/useCatalog.js`: filtro/ordenação/busca/cursor ↔ query params da URL (R-6), chamando `listPublicProducts`; expõe `{items, loading, error, hasMore, loadMore, filters, setFilters, refresh}` — testes em `frontend/src/hooks/__tests__/useCatalog.test.jsx` (estado lido/gravado na URL; loadMore anexa página)
- [ ] T010 [US1] Reescrever `frontend/src/pages/Products/index.jsx` + `styles.module.css`: grade de `ProductCard` sob `MainLayout`, `CategoryFilter` + `SortSelect`, skeleton de carregamento, estado vazio (com limpar filtros) e erro (retry), botão "carregar mais" (R-8); `document.title` da rota (FR-017)

**Checkpoint**: catálogo navegável, filtrável e ordenável — MVP demonstrável (Home → catálogo)

---

## Phase 4: User Story 2 - Ver o produto e adicionar ao carrinho (Priority: P1)

**Goal**: `/product/:id` com galeria+zoom, seletor de variação com estoque por combinação, e
"Adicionar ao carrinho" funcional sobre o `CartContext` em memória.

**Independent Test**: quickstart §2 e §5 — abrir um produto ativo, usar o zoom, selecionar variação,
ver estoque/últimas unidades, adicionar ao carrinho e ver o contador do header; 404 em produto
inativo/inexistente.

- [ ] T011 [US2] Criar `frontend/src/contexts/CartContext.jsx` (interface definitiva D4/FR-019: `items, count, subtotal, addItem, updateQty, removeItem, clear`, linha por `productId+variationId`, `unitPrice` = `effectivePrice`, validação de estoque) e registrar o provider na árvore da loja em `frontend/src/main.jsx` — testes em `frontend/src/contexts/__tests__/CartContext.test.jsx` (soma linha; bloqueia sem variação; bloqueia acima do estoque; subtotal/count; variação esgotada não adicionável — SC-004)
- [ ] T012 [P] [US2] Criar `frontend/src/components/ProductGallery/index.jsx` + `styles.module.css`: imagem principal (`w: main`) + miniaturas (`w: thumb`); zoom desktop por lupa/`background-position` e mobile por modal com pinch nativo, usando imagem `w: zoom` (R-3/D6)
- [ ] T013 [P] [US2] Criar `frontend/src/components/VariationSelector/index.jsx` + `styles.module.css`: seleção por atributo; combinações sem estoque desabilitadas/sinalizadas; expõe a variação selecionada e seu estoque (FR-008)
- [ ] T014 [US2] Criar `frontend/src/hooks/useProductPage.js`: `getPublicProduct(id)`; expõe `{product, loading, notFound, error, selection, selectVariation, currentStock, canBuy}` (canBuy = variação selecionada com estoque) — testes em `frontend/src/hooks/__tests__/useProductPage.test.jsx` (notFound em inativo/negado; canBuy falso sem estoque)
- [ ] T015 [US2] Reescrever `frontend/src/pages/Product/index.jsx` + `styles.module.css`: `ProductGallery`, nome/descrição/categoria (link p/ catálogo filtrado), `PriceTag`, `VariationSelector`, indicador "últimas unidades" (≤ `lowStockThreshold`, D7/FR-010), botão "Adicionar ao carrinho" (valida seleção → `addItem`, feedback + contador), 404 amigável (FR-011); `document.title` = nome do produto (FR-017)
- [ ] T016 [US2] Ligar o carrinho no header: criar `frontend/src/components/CartBadge/index.jsx` + `styles.module.css` (contador do `useCart`) e substituir o ícone de carrinho **não-funcional** em `frontend/src/components/Header/index.jsx`; criar visão mínima `frontend/src/pages/Cart/index.jsx` (itens + subtotal) e a rota `/cart` em `frontend/src/routes/index.jsx` (página completa é M2)

**Checkpoint**: fluxo Home → catálogo → produto → variação → carrinho completo (SC-001)

---

## Phase 5: User Story 3 - Buscar produtos (Priority: P2)

**Goal**: busca por nome/SKU/categoria via `searchKeywords` (array-contains), submetida no header e
renderizada em `/products?q=`.

**Independent Test**: quickstart §4 — buscar fragmento de nome, SKU exato e nome de categoria, com e
sem acento; estado vazio com sugestões; produto pré-backfill continua no catálogo.

- [ ] T017 [US3] Gravar `searchKeywords` no write do admin: incluir `buildSearchKeywords(name, sku, categoryName)` no `withDerivedFields` de `frontend/src/services/productService.js` (create/update) — estender `frontend/src/services/__tests__/productService.test.js` (searchKeywords derivado no create/update)
- [ ] T018 [US3] Criar `frontend/src/dev/backfillSearchKeywords.js` (idempotente; `window.backfillSearchKeywords` em dev, logado como admin — main.jsx já expõe utilitários dev) que recomputa `searchKeywords` para todos os produtos — testes em `frontend/src/dev/__tests__/backfillSearchKeywords.test.js` (idempotência: 2ª execução não muda nada)
- [ ] T019 [US3] Adicionar os índices N1 e N2 em `firestore.indexes.json` — N1 (`deleted ASC, status ASC, searchKeywords ARRAY_CONTAINS, createdAt DESC`) para busca simples e N2 (`deleted ASC, status ASC, categoryId ASC, searchKeywords ARRAY_CONTAINS, createdAt DESC`) para **busca + categoria** (US3-S3) — e deployar (`npx firebase-tools deploy --only firestore:indexes`); confirmar "Enabled" no console (contracts/firestore.md)
- [ ] T020 [US3] Ligar a busca do header: em `frontend/src/components/Header/index.jsx`, submeter no Enter/lupa navegando para `/products?q=termo` (FR-012, sem consulta ao vivo); garantir que `useCatalog` (T009) trata `?q=` chamando `listPublicProducts({search, categoryId})` — **busca compõe com o filtro de categoria** (usa N2 quando ambos presentes; durante busca a ordenação fica em recentes, US3-S3/FR-013) — e que a UI mostra estado vazio com sugestões — testes em `frontend/src/pages/Products/__tests__/search.test.jsx` (q na URL dispara busca; q+categoria compõem; vazio orienta)

**Checkpoint**: busca abrangente funcional, componível com categoria

---

## Phase 6: User Story 4 - Preço promocional com vigência (Priority: P2)

**Goal**: promoções aparecem só na vigência, no card e na página, avaliadas no fuso de Brasília.

**Independent Test**: quickstart §3 — produto com promoção vigente, futura e expirada renderizam
corretamente; produto com `promoPrice` sem datas = sempre vigente; teste de fuso.

- [ ] T021 [US4] Garantir que o `unitPrice` do carrinho e o preço "de compra" exibido na página usam `effectivePrice` (promo.js) — ajustar `useProductPage`/`Product` e `CartContext.addItem` se necessário; verificar que o card (T007) e a página (T015) já consomem `PriceTag`
- [ ] T022 [US4] Teste de integração de promoção em `frontend/src/utils/__tests__/promo.integration.test.jsx`: card e página com promoção antes/durante/depois da janela e sem datas; **fuso** — mesma data-limite com relógio simulado em fuso ≠ Brasília produz o mesmo estado vigente/expirado (SC-003)

**Checkpoint**: preço promocional correto e consistente entre superfícies e fusos

---

## Phase 7: User Story 5 - Experiência mobile e qualidade (Priority: P2)

**Goal**: vitrine utilizável em 375px, com skeletons, erros amigáveis e títulos por rota.

**Independent Test**: quickstart §6 — percorrer catálogo e produto em 375px sem scroll horizontal;
ver skeletons e o estado de erro offline; `document.title` correto.

- [ ] T023 [US5] Auditoria responsiva (viewport 375px) do catálogo e da página de produto: grade fluida, galeria e zoom por pinch utilizáveis, sem scroll horizontal (SC-009) — ajustes de CSS nos `styles.module.css` das telas/componentes conforme necessário
- [ ] T024 [US5] Confirmar estados de carregamento (skeletons) e erro (retry) em catálogo e produto e a normalização de `document.title` por rota/produto (FR-017); teste de erro em `frontend/src/pages/__tests__/storefront-error.test.jsx` (falha da consulta mostra retry, não quebra a página)

**Checkpoint**: vitrine sólida e responsiva em qualquer dispositivo

---

## Phase 8: Polish & Cross-Cutting

- [ ] T025 [P] Atualizar `docs/design-system.md` com os padrões novos da vitrine (grade do catálogo, `PriceTag`, badge "Esgotado", `ProductGallery`/zoom, `VariationSelector`, `CartBadge`/mini-carrinho) — constituição, Princípio III
- [ ] T026 Gates finais: `npm run lint` (zero erros), `npm run test` (127 baseline + novos verdes — SC-008) e `npm run build` (bundle da loja íntegro; rotas da vitrine no bundle principal, `/admin` segue lazy)
- [ ] T027 Executar a validação completa do quickstart.md (§0–6), incluindo backfill de `searchKeywords`, deploy do índice N1, e a regressão da loja (Home/login/registro e `/admin` inalterados)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — T001/T002/T003 em paralelo
- **Foundational (Phase 2)**: T005 depende de nada novo (usa searchKeywords util p/ a query); T006 depende de T002 (promo). **Bloqueia todas as user stories**
- **US1 (Phase 3)**: depende de Foundational (T005 leitura pública, T006 PriceTag) + T001 (imagens)
- **US2 (Phase 4)**: depende de Foundational (T005, T006) + T002 (effectivePrice no carrinho)
- **US3 (Phase 5)**: depende de Foundational + T003 (searchKeywords util) + US1 (T009 `useCatalog` trata `?q=`; T010 estados). Ordem interna: T017/T018/T019 (dados/índice) antes de T020 (UI da busca)
- **US4 (Phase 6)**: depende de T002/T006 (já foundational) + US1/US2 (superfícies onde a promo aparece)
- **US5 (Phase 7)**: depende de US1 + US2 existirem
- **Polish (Phase 8)**: depende de todas as stories desejadas

### Ordem recomendada (MVP-first)

Setup → Foundational → **US1 → US2** (MVP demonstrável, ambos P1) → US3 → US4 → US5 → Polish.

### Parallel Opportunities

- Phase 1: T001 ∥ T002 ∥ T003
- Phase 2: T006 em paralelo com T005 (arquivos distintos), após T002
- US1: T008 ∥ enquanto T007 avança; T009 depois; T010 por último
- US2: T012 ∥ T013 enquanto T011 avança; T014 depois; T015/T016 por último
- Polish: T025 em paralelo com T026

## Parallel Example: Foundational + US1

```text
# Setup (paralelo):
Task: T001 cloudinaryUrl + IMAGE_WIDTHS (cloudinaryService.js)
Task: T002 utils/promo.js (fuso SP)
Task: T003 utils/searchKeywords.js

# Após Foundational (T005, T006), início da US1:
Task: T008 CategoryFilter + SortSelect
# em sequência no domínio do catálogo:
Task: T007 → T009 → T010
```

## Implementation Strategy

### MVP (US1 + US2)

1. Phases 1–2 (utils + leitura pública segura + PriceTag)
2. Phase 3 (US1 catálogo) → **parar e validar** quickstart §1
3. Phase 4 (US2 produto + carrinho) → validar quickstart §2/§5 — **MVP da vitrine** (SC-001)

### Incremental Delivery

US1 (catálogo) → US2 (produto+carrinho) → US3 (busca, requer deploy do índice N1 + backfill) → US4
(promoção correta entre superfícies/fuso) → US5 (mobile/qualidade) → Polish. A loja permanece
intacta em cada incremento (T027 verifica regressão).

## Notes

- Nenhuma dependência nova (zoom próprio, CSS; helper Cloudinary por string).
- Nenhuma escrita pública nova nas rules — `firestore.rules` não muda (auditado em T004).
- `searchKeywords` é escrito só pelo admin (T017) + backfill (T018); produtos pré-backfill não somem
  do catálogo, só não são achados por busca até T018 rodar.
- Preços em centavos; `effectivePrice`/`PriceTag` são a exibição, o valor cobrado é congelado na
  transação do pedido (M4, já existente).
- Commit ao fim de cada fase/checkpoint; parar em cada checkpoint para validar a story.
