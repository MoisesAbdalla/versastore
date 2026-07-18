# Implementation Plan: Avaliações de Produtos (015)

**Branch**: `015-avaliacoes-produtos` | **Date**: 2026-07-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-avaliacoes-produtos/spec.md`

## Summary

Adicionar **avaliações de produtos** (nota 1–5 + comentário) com **pré-moderação** e **média denormalizada** no produto para a vitrine. Só **quem comprou** avalia (pedido não cancelado com o produto — checagem no client, forjável, endurecida no M4b). A avaliação nasce **pendente**; o lojista **aprova/oculta/remove** numa tela nova do admin, e a **média/contagem do produto** (`ratingAvg`/`ratingCount`) é recalculada pelo **admin** na moderação — o cliente nunca escreve o agregado. A vitrine (`ProductCard`) e a página do produto mostram estrelas + contagem; a página lista as avaliações aprovadas (paginadas). 100% client + Firestore + regras — **sem Blaze**.

Decisões do `/clarify` (2026-07-18): pré-moderação; só quem comprou; média nos cards + página; editar avaliação aprovada → volta a pendente. Segurança: nova coleção `reviews` com o cliente escrevendo só a própria (como `pendente`, id determinístico `productId_uid`), leitura pública só das aprovadas, e moderação/agregado só admin — mesmo padrão do M4a (option C) e cupons (013).

## Technical Context

**Language/Version**: JavaScript (ES Modules), React 19.2 + Vite 8 — sem TypeScript.

**Primary Dependencies**: Firebase SDK 12 (Firestore), React Router 7, MUI 9 (admin), CSS Modules + tokens de `variables.css`.

**Storage**: Firestore — **nova coleção `reviews`** (id = `productId_uid`) + campos aditivos `ratingAvg`/`ratingCount` no produto. Reusa `orders` (verificação de compra) e `products`.

**Testing**: Vitest 4 + RTL + jsdom; Firestore mockado (padrão do projeto). Média/validação/moderação testadas.

**Target Platform**: Web (loja + admin), responsivo.

**Project Type**: Web app single-frontend, **sem backend** (endurecimento server-side da compra verificada é M4b).

**Performance Goals**: vitrine lê a média já denormalizada no produto (sem consultar reviews por card); página do produto lista aprovadas paginadas (limit + cursor); admin lista pendentes.

**Constraints**: mudança **aditiva** no produto; **nova regra** para `reviews` + **2 índices novos** (deploy manual do lojista, como no M4a/013); não quebrar vitrine, produto, checkout (009), frete (011), cupons (013), lista de desejos (014), carrinho, conta, admin.

**Scale/Scope**: dezenas de avaliações por produto no máximo; catálogo pequeno-médio; pré-lançamento.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality** — PASS. Regra de média/validação isolada num util puro `utils/rating.js`; acesso a dados em `reviewService`; hook `useProductReviews` separa dados de apresentação; componente `StarRating` reutilizado (card + página). `oxlint` zero erros.
- **II. Testing Standards** — PASS. Não toca dinheiro/estoque/auth, mas toca a média exibida e a moderação → testar: cálculo da média (só aprovadas, arredondamento), validação (nota 1–5, limite do comentário), recompute na aprovação/ocultação/remoção, e a elegibilidade "comprou". Firestore mockado.
- **III. UX Consistency** — PASS. Estrelas nos tokens (cor de destaque); tela de moderação reusa o padrão de lista/ações do admin (003/008/013); formulário com estados carregando/erro/enviado; `docs/design-system.md` ganha a seção de avaliações.
- **IV. Performance** — PASS. Vitrine lê a média denormalizada (1 campo, sem N+1); página do produto usa `limit`+cursor; admin lista pendentes por `status` (sem carregar tudo); admin segue code-split.

Sem violações → Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/015-avaliacoes-produtos/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── services.md   # reviewService, util rating, regras, índices
│   └── ui.md         # estrelas no card/página, form + lista na página, tela admin de moderação
└── checklists/requirements.md
```

### Source Code (repository root)

```text
frontend/src/
├── services/
│   └── reviewService.js                # NOVO — submit/getMyReview/getApprovedReviews/hasPurchased; admin: list/approve/hide/remove + recomputeProductRating
├── utils/
│   ├── rating.js                       # NOVO — average, arredondamento, breakdown de estrelas (cheia/meia/vazia), validateReview
│   └── __tests__/rating.test.js
├── hooks/
│   └── useProductReviews.js            # NOVO — carrega aprovadas (paginado), minha avaliação, elegibilidade (comprou), submit
├── components/
│   ├── StarRating/index.jsx            # NOVO — exibe média (cheia/meia/vazia) + contagem (card e página)
│   └── ProductCard/index.jsx           # + StarRating (ratingAvg/ratingCount)
├── pages/
│   ├── Product/index.jsx               # + estrelas no topo + seção "Avaliações" (form se elegível + lista paginada)
│   └── Admin/Reviews/index.jsx         # NOVA tela — moderação (pendentes/aprovadas, aprovar/ocultar/remover) (+ styles)
├── layouts/AdminLayout/index.jsx       # + item de nav "Avaliações"
├── routes/index.jsx                    # rota /admin/avaliacoes (AdminRoute)
└── constants/
    ├── routes.js                       # + ADMIN_REVIEWS
    └── review.js                        # NOVO — REVIEW_STATUS + labels, limite do comentário

firestore.rules                          # + bloco match /reviews/{id} — DEPLOY MANUAL
firestore.indexes.json                   # + índice reviews (productId,status,createdAt) e orders (customerId,productIds array) — DEPLOY MANUAL
```

**Structure Decision**: single-frontend existente. Nova coleção `reviews` (id determinístico `productId_uid` garante 1 por produto/cliente e é validado nas rules). Média denormalizada no produto, **escrita só pelo admin** na moderação (recompute a partir das aprovadas) — o cliente não forja. Requer **um bloco novo em `firestore.rules`** e **2 índices** em `firestore.indexes.json` (deploy manual do lojista).

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
