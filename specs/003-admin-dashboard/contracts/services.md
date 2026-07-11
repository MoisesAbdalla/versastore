# Contracts: Services de domínio

**Feature**: 003-admin-dashboard | **Date**: 2026-07-11

Contratos das funções exportadas por `frontend/src/services/`. Regras gerais:

- Componentes e páginas **nunca** importam `firebase/firestore` — apenas services (via hooks).
- Todo erro esperado é lançado como `Error` com `code` estável (listado por função) e `message` em
  pt-BR pronta para toast.
- Listagens recebem `{filters, sort, pageSize = 20, cursor}` e retornam
  `{items, nextCursor, hasMore}` (cursor = último `DocumentSnapshot`; R-6).
- Valores monetários em centavos (ver data-model.md).

## productService.js (estender o existente)

| Função | Assinatura | Erros (`code`) |
|---|---|---|
| `listProducts` | `({search?, categoryId?, status?, stockRange?, sort?, pageSize?, cursor?}) → {items, nextCursor, hasMore}` | — (sempre filtra `deleted == false`) |
| `getProduct` | `(id) → Product \| null` | — |
| `createProduct` | `(data) → id` | `sku-duplicado`, `promocao-invalida`, `publicacao-incompleta` |
| `updateProduct` | `(id, changes) → void` | idem create + `nao-encontrado` |
| `deleteProduct` | `(id) → {soft: boolean}` | `nao-encontrado` — soft se houver pedidos (consulta `productIds`), física caso contrário |
| `duplicateProduct` | `(id) → newId` | `nao-encontrado` — cópia em `status: "rascunho"`, `sku: ""` (exige redefinição) |
| `bulkUpdateProducts` | `(ids, changes) → void` | — batched write (ativar/desativar/alterar categoria) |
| `bulkDeleteProducts` | `(ids) → {softIds, hardIds}` | — decide soft/física por produto |
| `checkSkuAvailable` | `(sku, {ignoreProductId?}) → boolean` | — cobre `sku` e `variationSkus` |
| `getFeaturedProducts` | existente — passa a filtrar `deleted == false` | — |

Derivações automáticas em create/update: `nameLower`, `skuUpper`, `descriptionText`, `totalStock`,
`variationSkus`, `categoryName`, sincronização de `image` (legado) com a imagem principal.

## categoryService.js (novo)

| Função | Assinatura | Erros |
|---|---|---|
| `listCategories` | `() → Category[]` (árvore montada no cliente; coleção pequena, sem paginação) | — |
| `createCategory` | `(data) → id` | `slug-duplicado`, `hierarquia-invalida` (pai já é subcategoria) |
| `updateCategory` | `(id, changes) → void` | idem + `nao-encontrado` |
| `deleteCategory` | `(id) → void` | `categoria-com-produtos`, `categoria-com-subcategorias` |
| `moveProducts` | `(fromCategoryId, toCategoryId) → movedCount` | `nao-encontrado` — lote atualizando `categoryId`/`categoryName` |

## orderService.js (novo — todas as mutações são transacionais, R-3)

| Função | Assinatura | Erros |
|---|---|---|
| `listOrders` | `({search?, status?, dateRange?, customerId?, sort?, pageSize?, cursor?}) → {items, nextCursor, hasMore}` | — |
| `getOrder` | `(id) → Order \| null` | — |
| `createOrder` | `({customerId, items, shippingAddress, paymentMethod}) → {id, orderNumber}` | `estoque-insuficiente` (aborta tudo), `produto-indisponivel` (deleted/inativo) |
| `advanceStatus` | `(id, nextStatus, {byUid, byName}) → void` | `transicao-invalida`, `nao-encontrado` |
| `cancelOrder` | `(id, {reason, byUid, byName}) → void` | `motivo-obrigatorio`, `transicao-invalida` — devolve estoque + ajusta `dailyStats`/agregados na mesma transação |
| `returnOrder` | `(id, {reason, byUid, byName}) → void` | idem cancelamento (só de `entregue`) |
| `setTrackingCode` | `(id, code) → void` | `nao-encontrado` |
| `setInternalNotes` | `(id, notes) → void` | `nao-encontrado` |

`createOrder` executa em uma única transação: valida estoque por item/variação → decrementa →
incrementa `counters/orders` → grava pedido (itens congelados + `productIds`) → atualiza
`dailyStats/{hoje}` → incrementa `orderCount`/`totalSpent` do cliente.

## customerService.js (novo)

| Função | Assinatura | Erros |
|---|---|---|
| `listCustomers` | `({search?, sort?, pageSize?, cursor?}) → {items, nextCursor, hasMore}` (query `role == "customer"`) | — |
| `getCustomer` | `(uid) → Customer \| null` | — |
| `getCustomerOrders` | `(uid, {pageSize?, cursor?}) → {items, nextCursor, hasMore}` | — |

## dashboardService.js (novo — leitura exclusiva de agregados, R-2)

| Função | Assinatura | Erros |
|---|---|---|
| `getOverviewStats` | `() → {today, last7Days, currentMonth}` cada um `{revenue, orderCount, avgTicket, unitsSold, deltaPct}` (delta vs. período anterior equivalente) | — |
| `getSalesSeries` | `({from, to}) → [{date, revenue, orderCount}]` (1 range query em `dailyStats`) | `periodo-invalido` |
| `getTopProducts` | `({from, to, limit = 5}) → [{productId, name, units}]` (merge client-side de `unitsByProduct`) | — |
| `getRecentOrders` | `(limit = 5) → Order[]` | — |
| `getAlerts` | `() → {lowStock: Product[], outOfStock: Product[], awaitingShipment: Order[], incompleteProducts: Product[]}` — cada lista com `limit` e link p/ tela de resolução | — |

## userService.js (novo)

| Função | Assinatura | Erros |
|---|---|---|
| `getUserProfile` | `(uid) → {role, name, email} \| null` | — usado pelo `AuthContext` estendido |
| `hasPermission` | `(role, capability) → boolean` | — resolve contra `constants/roles.js` (FR-003) |

## cloudinaryService.js (estender)

| Função | Assinatura | Erros |
|---|---|---|
| `uploadImage` | existente (1 tentativa) — mantida por compatibilidade | `upload-falhou` |
| `uploadImageWithRetry` | `(file, {attempts = 3, onProgress?}) → url` — backoff 1s/2s/4s (R-13) | `upload-falhou` (após esgotar tentativas), `arquivo-invalido` (formato/tamanho, validado antes do envio) |

## utils (novo)

| Módulo | Funções |
|---|---|
| `utils/format.js` | `formatBRL(cents)`, `formatDate(ts)`, `formatDateTime(ts)`, `formatPct(delta)` — tudo via `Intl`, locale `pt-BR` |
| `utils/csv.js` | `exportCsv({headers, rows, filename})` — BOM UTF-8, separador `;`, teto 5.000 linhas (R-9) |
| `utils/slugify.js` | `slugify(name) → slug` |

## Hooks (contratos de consumo)

| Hook | Retorno |
|---|---|
| `useListState(defaults)` | `{filters, sort, page, cursor, setFilters, ...}` sincronizado com query params da URL (R-6) |
| `usePagination(fetchPage)` | `{items, loading, error, hasMore, next, prev, refresh}` |
| `useProducts / useOrders / useCustomers / useCategories` | wrappers dos services com `{data, loading, error, ...ações}` |
| `useDashboard(period)` | `{stats, series, topProducts, recentOrders, alerts, loading, error}` |
| `useFeedback()` (de `FeedbackContext`) | `{toastSuccess(msg), toastError(msg)}` |

## Testes obrigatórios (constituição, Princípio II)

- `orderService`: criação com baixa de estoque; estoque insuficiente aborta tudo; transição
  inválida bloqueada; cancelamento devolve estoque + histórico + `dailyStats` na mesma transação;
  preço congelado nos itens.
- `productService`: SKU duplicado; publicação incompleta bloqueada; soft vs. hard delete; filtro
  `deleted == false` em toda listagem.
- `dashboardService`: deltas percentuais; merge de `unitsByProduct`.
- `categoryService`: bloqueio de exclusão com produtos; limite de 2 níveis.
- Guards: `AdminRoute` (admin renderiza, não-admin redireciona com mensagem, anônimo → login).
- `utils/csv` e `utils/format`: saídas exatas (BRL, datas, separador, BOM).
