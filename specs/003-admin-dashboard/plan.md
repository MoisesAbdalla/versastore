# Implementation Plan: Dashboard Administrativa do E-commerce

**Branch**: `003-admin-dashboard` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-admin-dashboard/spec.md`

## Summary

Construir o painel administrativo completo (visão geral, produtos, categorias, pedidos, clientes,
relatórios) inteiramente no frontend React existente + Firebase, sem backend e sem dependências
novas. A arquitetura segue os padrões já estabelecidos no repositório: acesso a dados encapsulado
em `frontend/src/services/` (um service por domínio) sobre o SDK em `frontend/src/firebase/`,
páginas em `pages/Admin/*` protegidas por `AdminRoute` (hoje vazio — será implementado), layout
próprio `AdminLayout`, CSS Modules com os tokens de `styles/variables.css` e componentes MUI.
As limitações do Firestore (sem SUM/GROUP BY, sem JOIN, sem full-text) são resolvidas com
desnormalização: agregados diários (`dailyStats`) mantidos por transação a cada pedido, itens de
pedido como cópia congelada, campos normalizados para busca por prefixo, paginação por cursor e
soft delete por flag. A autorização é dupla: `AdminRoute` no cliente e `firestore.rules` na camada
de dados, com papel armazenado em `users/{uid}`.

## Technical Context

**Language/Version**: JavaScript (ES Modules + JSX), sem TypeScript — `@types/*` apenas para o editor

**Primary Dependencies**: React 19.2, Vite 8.1, React Router DOM 7.18, Firebase SDK 12.15
(Auth + Firestore), MUI 9.2 (`@mui/material`, `@mui/icons-material`, `@mui/lab`), Emotion (via MUI).
**Nenhuma dependência nova** — gráfico de vendas e editor de texto básico são componentes próprios
(ver research.md R-10 e R-11)

**Storage**: Cloud Firestore (coleções `products`, `categories`, `orders`, `users`, `dailyStats`,
`counters`); imagens no Cloudinary via `cloudinaryService.js` existente (upload direto do cliente,
com retry a ser adicionado)

**Testing**: Vitest 4 + React Testing Library + jsdom (setup existente em `src/setupTests.js`);
Firestore mockado nos testes de service (padrão já usado em `services/__tests__/productService.test.js`)

**Target Platform**: Web responsivo (desktop + mobile), navegadores evergreen

**Project Type**: SPA frontend (`frontend/`) — backend Python fora do escopo desta fase

**Performance Goals**: Visão geral interativa < 2s (SC-003) via agregados pré-calculados (nunca
varrer `orders`); listagens paginadas por cursor (20/página); rotas `/admin/*` com code splitting
(`React.lazy`) para não pesar o bundle da loja (constituição, Princípio IV)

**Constraints**: Sem novas dependências de UI/estado/dados; sem backend; compatibilidade total com
as páginas existentes da loja (rotas e estilos intactos); textos em pt-BR, moeda BRL e datas
dd/mm/aaaa via `Intl` em `utils/`; proteção de dados obrigatória em `firestore.rules` (não só no
cliente)

**Scale/Scope**: Loja única, catálogo estimado em centenas de produtos e dezenas de pedidos/dia;
~12 telas novas no painel; 5 services novos + 2 estendidos; 1 contexto novo (feedback/toasts)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|---|---|---|
| I. Code Quality | oxlint no CI local (`npm run lint`); componentes pequenos (hook de dados + componente de apresentação); nomes do domínio existente (`Product`, `Order`, `User`, `Category`); sem código morto — a consolidação `context/`→`contexts/` remove a pasta vazia | PASS |
| II. Testing | Lógica de dinheiro/estoque/auth é NON-NEGOTIABLE: `orderService` (transições de status, cancelamento com devolução de estoque, transação de baixa), `productService` (soft delete, SKU único), `dashboardService` (agregados), guards de rota — todos com testes Vitest determinísticos, Firestore mockado (sem rede) | PASS |
| III. UX Consistency | Tokens de `docs/design-system.md` via tema MUI + `variables.css`; variantes compartilhadas de botão/input reaproveitadas; todo fluxo com loading (skeletons), sucesso (toasts) e erro em pt-BR; `docs/design-system.md` será atualizado no mesmo PR com os novos padrões do painel (tabela, sidebar, stat card) | PASS |
| IV. Performance | Leituras sempre com escopo: cursor + `limit(20)` nas listagens, agregados `dailyStats` na visão geral (zero varredura de `orders`), índices compostos declarados; `React.lazy` em todas as rotas `/admin/*`; memoização onde perfil apontar custo | PASS |

**Violações**: nenhuma. Tabela de Complexity Tracking não se aplica.

**Re-check pós-Fase 1**: mantido PASS — o design (data-model, contracts) não introduziu
dependências novas nem leituras não paginadas; a única leitura potencialmente ampla (gráfico de 12
meses) é uma range query única sobre `dailyStats` (≤ 366 docs pequenos), documentada em research R-2.

## Project Structure

### Documentation (this feature)

```text
specs/003-admin-dashboard/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — decisões de arquitetura (Firestore/NoSQL)
├── data-model.md        # Fase 1 — coleções, campos, transições, validações
├── quickstart.md        # Fase 1 — guia de validação ponta a ponta
├── contracts/
│   ├── services.md      # Contratos dos services de domínio (assinaturas + erros)
│   └── firestore.md     # Regras de segurança + índices compostos exigidos
└── tasks.md             # Fase 2 — gerado por /speckit-tasks (não por este comando)
```

### Source Code (repository root)

```text
firebase.json                        # NOVO — aponta rules/indexes p/ o Firebase CLI
firestore.rules                      # NOVO — regras de segurança, versionadas no repo
firestore.indexes.json               # NOVO — 16 índices compostos (contracts/firestore.md)
                                     # Deploy de ambos (tarefa própria no /tasks):
                                     #   npx firebase-tools deploy --only firestore:rules,firestore:indexes
                                     # (firebase-tools via npx — não vira dependência do projeto)
package.json                         # LIMPEZA — remover 2 deps instaladas por engano na raiz

frontend/src/
├── components/
│   ├── ConfirmDialog/               # NOVO — confirmação de ações destrutivas (MUI Dialog)
│   ├── DataTable/                   # NOVO — tabela com skeleton, ordenação, seleção em massa,
│   │                                #        paginação por cursor e estado vazio
│   ├── EmptyState/                  # NOVO — estados vazios orientando próximo passo
│   ├── StatCard/                    # NOVO — card de indicador com variação percentual
│   ├── SalesChart/                  # NOVO — gráfico SVG próprio (sem lib nova; research R-10)
│   └── RichTextField/               # NOVO — formatação básica (negrito/itálico/listas; R-11)
├── constants/
│   ├── routes.js                    # ESTENDER — rotas do painel
│   ├── orderStatus.js               # NOVO — status do pedido + mapa de transições válidas
│   ├── roles.js                     # NOVO — papéis e permissões por funcionalidade
│   └── product.js                   # NOVO — status de produto, limites de upload
├── contexts/
│   ├── AuthContext.jsx              # ESTENDER — carregar papel de users/{uid}; expor role/isAdmin
│   └── FeedbackContext.jsx          # NOVO — toasts (MUI Snackbar/Alert) para todo o app
│   # a pasta vazia src/context/ é removida (consolidação)
├── firebase/                        # inalterado (config, auth, firestore, storage)
├── hooks/
│   ├── usePagination.js             # NOVO — cursor stack + limit(20)
│   ├── useListState.js              # NOVO — filtros/busca/ordenação/página ↔ query params da URL
│   ├── useProducts.js               # NOVO
│   ├── useOrders.js                 # NOVO
│   ├── useCustomers.js              # NOVO
│   ├── useCategories.js             # NOVO
│   └── useDashboard.js              # NOVO
├── layouts/
│   ├── MainLayout/                  # inalterado (loja)
│   └── AdminLayout/                 # NOVO — sidebar fixa + header (usuário logado, busca global)
├── pages/Admin/
│   ├── Dashboard/                   # NOVO — visão geral (US5)
│   ├── Products/                    # REESTRUTURAR — List (tabela/filtros/massa) + Form
│   │                                #   (seções, variações, imagens, rascunho); absorve o
│   │                                #   cadastro atual de pages/Admin/index.jsx e o
│   │                                #   ProductList/ProductEdit da feature 002
│   ├── Categories/                  # NOVO (US3)
│   ├── Orders/                      # NOVO — List + Detail (US4)
│   ├── Customers/                   # NOVO — List + Detail (US6)
│   ├── Reports/                     # NOVO (US7)
│   └── AccessDenied/                # NOVO — mensagem clara p/ usuário sem papel (US1)
├── routes/
│   ├── index.jsx                    # ESTENDER — rotas aninhadas /admin/* com React.lazy
│   ├── AdminRoute.jsx               # IMPLEMENTAR — arquivo existe vazio; guard por papel
│   └── PrivateRoute.jsx             # IMPLEMENTAR — arquivo existe vazio; guard por sessão
├── services/
│   ├── productService.js            # ESTENDER — cursor, filtros, soft delete, SKU, variações
│   ├── categoryService.js           # NOVO
│   ├── orderService.js              # NOVO — transações de estoque/status/dailyStats
│   ├── customerService.js           # NOVO
│   ├── dashboardService.js          # NOVO — leitura de dailyStats e alertas
│   ├── userService.js               # NOVO — papel/permissões de users/{uid}
│   └── cloudinaryService.js         # ESTENDER — retry com backoff (R-13)
└── utils/
    ├── format.js                    # NOVO — Intl: BRL, dd/mm/aaaa, percentual
    ├── csv.js                       # NOVO — exportação CSV no cliente (R-9)
    └── slugify.js                   # NOVO — slug de categoria
```

**Structure Decision**: mantém a estrutura de projeto único em `frontend/` já existente. Todo o
painel vive sob `pages/Admin/` com layout e guard próprios; a loja (MainLayout, Home etc.) não é
tocada. Regras e índices do Firestore são **arquivos versionados na raiz do repositório**
(`firebase.json` + `firestore.rules` + `firestore.indexes.json`, padrão do Firebase CLI) — únicos
arquivos novos fora de `frontend/` — com deploy por
`npx firebase-tools deploy --only firestore:rules,firestore:indexes`; a criação desses arquivos e o
deploy devem constar como tarefas explícitas no tasks.md (fase de fundação, antes de qualquer
consulta que dependa de índice composto).

## Decisões de arquitetura (resumo — detalhes em research.md)

| # | Tema | Decisão |
|---|---|---|
| R-1 | Variações de produto | Array embutido no documento do produto (não subcoleção) |
| R-2 | Indicadores/gráficos | `dailyStats/{yyyy-mm-dd}` mantido por transação a cada pedido; visão geral e relatórios leem só esses docs |
| R-3 | Estoque | Transações Firestore: baixa na criação, devolução no cancelamento/devolução na MESMA transação da mudança de status |
| R-4 | Papel do usuário | Documento `users/{uid}.role` (custom claims exigiriam Admin SDK/backend — fora do escopo) |
| R-5 | Busca | Prefixo sobre campos normalizados (`nameLower`, `skuUpper`); limitação documentada (sem substring/full-text) |
| R-6 | Paginação | Cursores `startAfter` + `limit(20)`; filtros/ordenação/cursor na URL (query params) |
| R-7 | Soft delete | Flag `deleted` (boolean, default false) + `deletedAt`; toda listagem filtra `deleted == false` |
| R-8 | Índices compostos | Lista declarada em contracts/firestore.md + `firestore.indexes.json` |
| R-9 | CSV | Gerado no cliente (Blob + BOM UTF-8, separador `;`, cabeçalhos pt-BR) a partir dos dados filtrados |
| R-10 | Gráfico de vendas | Componente SVG próprio (sem lib de gráficos — restrição de dependências) |
| R-11 | Descrição rica | Editor próprio leve (negrito/itálico/listas) com sanitização por allowlist |
| R-12 | Rascunho automático | localStorage com debounce, por produto; imagens persistem como URLs já enviadas |
| R-13 | Upload Cloudinary | Retry com backoff exponencial (3 tentativas) por imagem; falha isolada não trava o formulário |
| R-14 | Número do pedido | Contador sequencial em `counters/orders` incrementado na transação de criação |
| R-15 | Clientes | Coleção única `users` (papel `customer`); agregados `orderCount`/`totalSpent` mantidos na transação do pedido |

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
