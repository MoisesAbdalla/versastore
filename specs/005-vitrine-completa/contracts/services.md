# Contracts: Services, Contexto e Utils da Vitrine

**Feature**: 005-vitrine-completa | **Date**: 2026-07-12

Regras gerais: páginas e componentes consomem services/hooks, nunca `firebase/firestore` direto.
Valores monetários em centavos. Leitura pública sempre restrita a `status == "ativo" &&
deleted == false`.

## productService.js (estender)

| Função | Assinatura | Notas |
|---|---|---|
| `withDerivedFields` (interno) | passa a gravar `searchKeywords` | via `buildSearchKeywords(name, sku, categoryName)`; afeta create/update do admin |
| `listPublicProducts` | `({categoryId?, sort?, search?, cursor?, pageSize=20}) → {items, nextCursor, hasMore}` | força `deleted==false` **e** `status=="ativo"`; `search` → `array-contains` em `searchKeywords`; `sort` ∈ {recentes, preço↑, preço↓, nome↑, nome↓}; durante `search`, ordenação fixa em createdAt |
| `getPublicProduct` | `(id) → Product \| null` | `null` se inexistente, inativo ou `permission-denied` (404 sem vazar) |
| `checkSkuAvailable`, `listProducts`, `getProduct`, `createProduct`, `updateProduct`, ... | inalteradas | continuam servindo o admin |

Erros: `listPublicProducts`/`getPublicProduct` **não** lançam para inativo/negado — retornam vazio/
null; erro de rede real propaga para a UI tratar (retry).

## cloudinaryService.js (estender)

| Função | Assinatura | Notas |
|---|---|---|
| `cloudinaryUrl` | `(url, { w, extra? }) → string` | insere `f_auto,q_auto,w_{w}{,extra}` após `/upload/`; URL fora do padrão Cloudinary retorna inalterada |
| `IMAGE_WIDTHS` | const | `{ card: 400, thumb: 120, main: 800, zoom: 1600 }` (larguras por contexto) |
| `uploadImage`, `uploadImageWithRetry`, `validateImageFile` | inalteradas | — |

## utils/promo.js (novo)

| Função | Assinatura | Notas |
|---|---|---|
| `isPromoActive` | `(product, now = new Date()) → boolean` | `promoPrice < price` e (sem datas → true; com datas → dentro da janela **no fuso America/Sao_Paulo**) |
| `effectivePrice` | `(product, now?) → { price, isPromo, discountPct }` | `price` = promocional se vigente, senão normal; `discountPct` arredondado |

## utils/searchKeywords.js (novo)

| Função | Assinatura | Notas |
|---|---|---|
| `buildSearchKeywords` | `(name, sku, categoryName) → string[]` | tokens normalizados + prefixos ≥ 3, sem duplicatas, ordenados (idempotente) |
| `normalizeQueryTerm` | `(term) → string` | um token normalizado p/ o `array-contains` (mesma normalização) |

Reusa `normalizeForSearch` de `utils/slugify.js` (já existente) para acento/caixa.

## contexts/CartContext.jsx (novo — D4/FR-019)

Interface **definitiva** (M2 troca só a persistência):

| Membro | Assinatura | Notas |
|---|---|---|
| `items` | `CartLine[]` | ver forma em data-model.md |
| `count` | number | soma das quantidades |
| `subtotal` | number (centavos) | soma `unitPrice × quantity` |
| `addItem` | `(product, variation, qty=1) → {ok, reason?}` | valida seleção e estoque; soma à linha existente; `reason` ∈ {`variacao-obrigatoria`, `sem-estoque`, `estoque-insuficiente`} |
| `updateQty` | `(lineId, qty) → void` | trava em `maxStock`; qty 0 remove |
| `removeItem` | `(lineId) → void` | |
| `clear` | `() → void` | |
| `useCart()` | hook | consumo pelos componentes |

Provider registrado no `main.jsx` (envolvendo a árvore da loja; o `/admin` não depende dele).

## hooks

| Hook | Retorno | Notas |
|---|---|---|
| `useCatalog()` | `{ items, loading, error, hasMore, loadMore, filters, setFilters, refresh }` | filtros/ordenação/busca/cursor ↔ URL; chama `listPublicProducts` |
| `useProductPage(id)` | `{ product, loading, notFound, error, selection, selectVariation, currentStock, canBuy }` | chama `getPublicProduct`; `notFound` → 404 |
| `useCart()` | ver CartContext | — |

## Testes obrigatórios (constituição II + SC)

- `utils/promo`: vigente/expirada/futura/sem-datas; **fuso** — mesma data-limite avaliada com o
  relógio simulado em fuso ≠ Brasília dá o mesmo resultado (SC-003).
- `utils/searchKeywords`: prefixos ≥ 3; nome + SKU + categoria; acentos/caixa; idempotência;
  `normalizeQueryTerm` casa com um keyword gerado (SC-006).
- `productService`: `listPublicProducts` sempre inclui `status==ativo` + `deleted==false`;
  `search` usa `array-contains`; `getPublicProduct` mapeia inativo/`permission-denied` → null (SC-002).
- `cloudinaryService.cloudinaryUrl`: injeta `f_auto,q_auto,w_` na posição certa; passa URL não-
  Cloudinary sem alterar.
- `CartContext`: adiciona/soma linha; bloqueia sem variação; bloqueia acima do estoque; subtotal/
  count corretos; variação esgotada não é adicionável (SC-004).
- `ProductCard`/`PriceTag`: promoção vigente mostra riscado + promocional + %; fora de vigência só
  normal (SC-003); badge "Esgotado" quando totalStock 0 (D1).
