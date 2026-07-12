# Data Model: Vitrine Completa

**Feature**: 005-vitrine-completa | **Date**: 2026-07-12

A vitrine é **read-only** sobre o modelo da feature 003. A única mudança de schema é o campo
`searchKeywords` no produto (escrito pelo admin). O carrinho é estado client-side, não persiste no
Firestore no M1.

## Coleção `products` — mudança

| Campo | Tipo | Regras |
|---|---|---|
| `searchKeywords` | array\<string\> | **NOVO.** Tokens normalizados (minúsculas, sem acentos) + prefixos ≥ 3 derivados de `name`, `sku` e `categoryName`. Gravado pelo admin em todo create/update (`withDerivedFields`) e por backfill. Consultado pela vitrine via `array-contains`. |

Todos os demais campos já existem e são **lidos** pela vitrine sem alteração: `name`,
`nameLower`, `sku`, `price` (centavos), `promoPrice`, `promoStart`, `promoEnd`, `images[]`
(`{url, isMain}`), `image` (legado, imagem principal), `stock`, `variations[]`
(`{id, attributes, sku, price?, stock}`), `totalStock`, `lowStockThreshold`, `status`, `deleted`,
`categoryId`, `categoryName`, `createdAt`.

**Visibilidade pública**: apenas produtos com `status == "ativo" && deleted == false` (imposto pelas
rules **e** pelas consultas públicas — R-1). Produtos legados sem `searchKeywords` continuam
visíveis no catálogo; apenas não são encontrados por busca até o backfill.

### Derivação de `searchKeywords` (utils/searchKeywords.js)

```text
buildSearchKeywords(name, sku, categoryName) →
  união, sem duplicatas, de prefixos (len ≥ 3 .. token inteiro) de cada token normalizado de:
    - tokens de name (split por espaço)
    - sku normalizado (token único, mais prefixos)
    - tokens de categoryName
```

O mesmo módulo normaliza o **termo de busca** (um token) para casar por `array-contains`.
Idempotência: recomputar sobre os mesmos dados produz o mesmo array (ordenado) — base do backfill.

## Coleções lidas sem mudança

- **`categories`**: leitura pública (já permitida) para o filtro/navegação e como fonte de
  `categoryName` nos keywords. A vitrine lista categorias-raiz e subcategorias (árvore da 003).
- **`orders` / `users` / `dailyStats` / `counters` / `settings`**: **não** acessadas pela vitrine
  neste módulo.

## Entidade nova (client-side): Carrinho

Estado em memória do `CartContext` (não persiste no M1). Forma da **linha** de carrinho:

| Campo | Tipo | Descrição |
|---|---|---|
| `lineId` | string | `productId` + `variationId` (identidade da linha; mesma variação soma qty) |
| `productId` | string | referência ao produto |
| `variationId` | string \| null | variação escolhida (null = produto simples) |
| `name` | string | cópia do nome para exibição |
| `variationLabel` | string \| null | ex.: "M / Azul" |
| `unitPrice` | number (centavos) | **preço efetivo** no momento (com promoção vigente) — conveniência de UI |
| `imageUrl` | string | imagem principal (transformada) |
| `quantity` | number ≥ 1 | limitada ao estoque da variação |
| `maxStock` | number | estoque disponível no momento (trava do `updateQty`) |

Agregados expostos: `count` (soma de quantidades), `subtotal` (soma `unitPrice × quantity`).

**Fonte de verdade de preço**: o `unitPrice` da linha é para exibição/subtotal na UI. O valor
realmente cobrado é congelado pela transação do pedido no checkout (M4, já implementado) — o
carrinho não é autoridade de preço.

## Regras de disponibilidade (derivadas, sem novo campo)

- **Esgotado** (badge no card, botão desabilitado na página): produto sem variações com
  `stock == 0`, ou com variações e `totalStock == 0`.
- **Variação indisponível**: `variation.stock == 0` → opção desabilitada/sinalizada; botão de
  compra desabilitado enquanto a combinação selecionada estiver sem estoque.
- **"Últimas unidades"**: estoque da variação (ou `stock` do produto simples) `> 0` e
  `<= (product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)` (D7).
- **Promoção vigente**: ver `utils/promo.js` (R-4) — `promoPrice < price` e, havendo datas,
  `promoStart <= agora(America/Sao_Paulo) <= promoEnd`; sem datas, sempre vigente.

## Validações centralizadas

- Busca: termo normalizado com ≥ 3 caracteres (UI orienta abaixo disso).
- `CartContext.addItem`: exige variação selecionada quando o produto tem variações; `quantity`
  nunca excede `maxStock`; produto/variação sem estoque não é adicionável.
- `getPublicProduct`: `permission-denied` ou inexistente → `null` (404), sem distinção observável.
