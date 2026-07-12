# Implementation Plan: Vitrine Completa (Catálogo, Produto e Busca)

**Branch**: `005-vitrine-completa` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-vitrine-completa/spec.md`

## Summary

Construir a camada de apresentação pública da loja — catálogo (`/products`), página de produto
(`/product/:id`) e busca — sobre a infraestrutura já existente (services, modelo de dados, rules e
índices da feature 003), sem backend e sem dependências novas. O catálogo lê **apenas produtos
ativos** via variantes públicas dos services (a leitura pública já é restrita nas rules a
`status == "ativo" && deleted == false`); a página de produto traz galeria com zoom (CSS transform +
modal, sem lib), seletor de variação com estoque por combinação e o botão "Adicionar ao carrinho"
funcional sobre um `CartContext` novo em memória (interface definitiva do M2). A busca usa um campo
desnormalizado `searchKeywords` (tokens + prefixos de nome/SKU/categoria) consultado por
`array-contains` — escrito só pelo admin e preenchido por backfill idempotente. Todas as imagens
passam por transformações Cloudinary (`f_auto,q_auto,w_`). Estado de catálogo (filtro, ordenação,
busca, cursor) vive 100% na URL. Vigência de promoção avaliada no fuso America/Sao_Paulo.

## Technical Context

**Language/Version**: JavaScript (ES Modules + JSX), sem TypeScript

**Primary Dependencies**: React 19.2, Vite 8.1, React Router DOM 7.18, Firebase SDK 12.15
(Firestore), MUI 9.2, Emotion. **Nenhuma dependência nova** — zoom e galeria em CSS/SVG próprios
(research R-3)

**Storage**: Cloud Firestore (leitura pública de `products`/`categories`); imagens no Cloudinary
(entrega com transformação por URL). Escrita nova: só o campo `products.searchKeywords`, gravado
pelo service do admin (regra `allow write: if isAdmin()` já existente)

**Testing**: Vitest 4 + React Testing Library + jsdom; Firestore mockado nos services (padrão da
003). Linha de base a preservar: 127 testes verdes (SC-008)

**Target Platform**: Web responsivo (desktop + mobile, viewport ≥ 375px)

**Performance Goals**: catálogo/produto interativos < 3s no perfil da constituição; leituras
paginadas por cursor (20/página); imagens dimensionadas por contexto via Cloudinary; as rotas da
loja fazem parte do bundle principal (a loja é o caminho crítico — não são lazy como o /admin)

**Constraints**: sem escrita pública nova nas rules (FR-015, auditar antes de codar); sem
dependências novas; compatibilidade total com a Home e o painel existentes; textos pt-BR, moeda BRL,
vigência de promoção em America/Sao_Paulo; produto inativo inacessível por lista, busca e URL direta
(SC-002)

**Scale/Scope**: catálogo de centenas de produtos; ~3 telas públicas novas + header/carrinho;
2 leituras públicas no productService + extensão (searchKeywords) + CartContext + backfill

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|---|---|---|
| I. Code Quality | oxlint; componentes pequenos (hook de dados + apresentação); reuso do `ProductCard`/seções da Home; nomes do domínio (`Product`, `Category`, `Cart`) | PASS |
| II. Testing | A lógica testável aqui é a de **vitrine/carrinho** (dinheiro/estoque transacional é M4). NON-NEGOTIABLE por SC: vigência de promoção (antes/durante/depois, fuso SP), disponibilidade de variação (botão nunca habilitado sem estoque), produto inativo inacessível, normalizador de busca simétrico, `CartContext` (add/estoque/subtotal), backfill idempotente | PASS |
| III. UX Consistency | tokens de `variables.css`/design system; reuso de `ProductCard`, `EmptyState`, skeletons; loading/erro/vazio em toda tela; `docs/design-system.md` atualizado no mesmo PR (galeria/zoom, grid do catálogo, badge Esgotado, mini-carrinho) | PASS |
| IV. Performance | leituras com escopo (cursor + `limit`, sempre `status==ativo`); imagens Cloudinary por contexto (`f_auto,q_auto,w_`) evitam baixar full-res no card; sem varredura; memoização onde o perfil apontar | PASS |

**Violações**: nenhuma. Complexity Tracking não se aplica.

**Re-check pós-Fase 1**: mantido PASS — o design não introduz dependência nova (zoom próprio),
não abre escrita pública (searchKeywords é admin-only) e não adiciona leitura não paginada. Único
índice novo: `searchKeywords array-contains + orderBy` (contracts/firestore.md).

## Project Structure

### Documentation (this feature)

```text
specs/005-vitrine-completa/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — decisões (busca, zoom, público vs admin, fuso)
├── data-model.md        # Fase 1 — searchKeywords, leitura pública, forma do carrinho
├── quickstart.md        # Fase 1 — validação ponta a ponta
├── contracts/
│   ├── services.md      # Services públicos + CartContext + helper Cloudinary
│   └── firestore.md     # Auditoria de rules + índice de searchKeywords
└── tasks.md             # Fase 2 — /speckit-tasks (não por este comando)
```

### Source Code (repository root)

```text
firestore.indexes.json               # ESTENDER — índice searchKeywords (array-contains + createdAt)
                                     #   deploy: npx firebase-tools deploy --only firestore:indexes

frontend/src/
├── components/
│   ├── ProductCard/                 # ESTENDER — preço promocional vigente, badge "Esgotado",
│   │                                #   imagem via Cloudinary por contexto (hoje usa product.image cru)
│   ├── Header/                      # ESTENDER — ligar o campo de busca (submit→/products?q=) e o
│   │                                #   ícone de carrinho (contador do CartContext)
│   ├── ProductGallery/              # NOVO — imagem principal + miniaturas + zoom (hover/lupa + modal)
│   ├── VariationSelector/           # NOVO — seleção por atributo, estoque por combinação
│   ├── PriceTag/                    # NOVO — preço + promocional vigente + % desconto (card e página)
│   ├── SortSelect/                  # NOVO — seletor de ordenação do catálogo
│   ├── CategoryFilter/              # NOVO — filtro de categoria (estado na URL)
│   └── CartBadge/                   # NOVO — contador do carrinho no header (+ mini-drawer opcional)
├── contexts/
│   └── CartContext.jsx              # NOVO — addItem/removeItem/updateQty/items/subtotal/count (D4/FR-019)
├── hooks/
│   ├── useCatalog.js                # NOVO — lista pública paginada + filtro/ordenação/busca da URL
│   └── useProductPage.js            # NOVO — carrega 1 produto público + estado de variação/zoom
├── pages/
│   ├── Products/                    # REESCREVER — catálogo (hoje placeholder <h1>)
│   ├── Product/                     # REESCREVER — página de produto (hoje placeholder <h1>)
│   └── Cart/                        # MÍNIMO — visão simples do carrinho em memória (M2 completa)
├── services/
│   ├── productService.js            # ESTENDER — searchKeywords em withDerivedFields;
│   │                                #   listPublicProducts (força status==ativo, busca por keyword);
│   │                                #   getPublicProduct (permission-denied → null p/ 404)
│   └── cloudinaryService.js         # ESTENDER — cloudinaryUrl(url, {w, ...}) inserindo f_auto,q_auto,w_
├── utils/
│   ├── promo.js                     # NOVO — isPromoActive/effectivePrice no fuso America/Sao_Paulo
│   └── searchKeywords.js            # NOVO — buildSearchKeywords(name, sku, categoryName) + tokenização
│                                    #   (normalizador compartilhado: admin write, backfill e query)
├── dev/
│   └── backfillSearchKeywords.js    # NOVO — backfill idempotente (window.backfillSearchKeywords em dev)
└── routes/index.jsx                 # ESTENDER — /cart (mínimo); /products e /product/:id já existem
```

**Structure Decision**: mantém o projeto único em `frontend/`. A vitrine vive em `pages/Products`,
`pages/Product`, `pages/Cart` sob o `MainLayout` existente (TopBar+Header+Navbar+Footer) — sem tocar
no `/admin`. O `productService` é **estendido** (não duplicado): o campo `searchKeywords` entra no
`withDerivedFields` já existente (admin) e ganha funções de **leitura pública** que forçam
`status==ativo` e tratam a negação das rules como 404. Único arquivo novo fora de `frontend/` é a
extensão de `firestore.indexes.json` (deploy pelo Firebase CLI).

## Decisões de arquitetura (resumo — detalhes em research.md)

| # | Tema | Decisão |
|---|---|---|
| R-1 | Leitura pública | Variantes `listPublicProducts`/`getPublicProduct` forçam `status==ativo`; `getPublicProduct` mapeia `permission-denied` → null (404 sem vazar existência — SC-002) |
| R-2 | Busca | Campo `searchKeywords` (tokens + prefixos ≥3 de nome/SKU/nome-da-categoria, normalizados) consultado por `array-contains`; escrito só pelo admin; backfill idempotente |
| R-3 | Zoom da galeria | Componente próprio: desktop lupa via `background-position`; mobile modal com pinch nativo — sem dependência (constituição/spec) |
| R-4 | Vigência de promoção | `utils/promo.js` avalia no fuso America/Sao_Paulo (Intl), nunca no fuso do cliente; sem datas = sempre vigente |
| R-5 | Imagens | `cloudinaryUrl(url, {w})` insere `f_auto,q_auto,w_{ctx}` após `/upload/`; tamanhos por contexto (card, miniatura, principal, zoom) |
| R-6 | Estado do catálogo | Filtro/ordenação/busca/cursor 100% na URL (reuso do padrão `useListState`/`usePagination` do admin, adaptado à loja) |
| R-7 | CartContext | Interface definitiva (add/remove/updateQty/items/subtotal/count) com validação de estoque; M1 em memória, M2 injeta persistência sem mudar consumidores |
| R-8 | Paginação | Cursor + "carregar mais" (append); filtros/ordenação/busca compartilháveis pela URL; profundidade de scroll não restaurada em deep-link (aceito) |
| R-9 | Ordenação | Reuso dos índices `deleted+status+{createdAt,price,nameLower}`; verificar direção do trailing orderBy (preço↓/nome Z–A) — Firestore reverte índice quando só há igualdades antes |

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
