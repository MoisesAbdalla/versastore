# Data Model: Dashboard Administrativa do E-commerce

**Feature**: 003-admin-dashboard | **Date**: 2026-07-11

Modelagem das coleções do Firestore. Convenções: timestamps são `Timestamp` do Firestore
(`serverTimestamp()` em campos de topo; `Timestamp.now()` dentro de arrays — limitação do SDK);
campos `*Lower`/`*Upper` são desnormalizações para busca por prefixo (research R-5); valores
monetários em **centavos** (inteiro) para evitar erro de ponto flutuante, formatados com
`Intl.NumberFormat("pt-BR", {currency: "BRL"})` apenas na exibição.

## Coleção `products`

Compatibilidade: os campos existentes (`name`, `category`, `price`, `stock`, `description`,
`image`, `destaque`, `createdAt`) são preservados/estendidos; a loja continua funcionando. Produtos
legados são normalizados na primeira edição pelo painel (preenchimento de defaults).

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | obrigatório para publicar |
| `nameLower` | string | derivado (minúsculas, sem acentos); gravado em todo create/update |
| `description` | string (HTML sanitizado) | allowlist `b strong i em ul ol li p br` (R-11) |
| `descriptionText` | string | texto puro derivado, p/ alerta "descrição incompleta" (< 20 chars) |
| `brand` | string | opcional |
| `tags` | array\<string\> | opcional |
| `categoryId` | string (ref lógica `categories`) | obrigatório para publicar |
| `categoryName` | string | desnormalizado p/ exibição em listagens sem join |
| `sku` | string | único no catálogo (validação por consulta antes de gravar) |
| `skuUpper` | string | derivado, busca por prefixo |
| `price` | number (centavos) | obrigatório para publicar; > 0 |
| `promoPrice` | number (centavos) \| null | < `price` quando presente |
| `promoStart` / `promoEnd` | Timestamp \| null | `promoEnd > promoStart` (validado no service) |
| `images` | array\<{url, publicId, isMain}\> | ordem do array = ordem de exibição; exatamente 1 `isMain` |
| `image` | string (URL) | **legado** — mantido em sincronia com a imagem principal p/ loja atual |
| `stock` | number ≥ 0 | estoque do produto **sem** variações |
| `totalStock` | number ≥ 0 | derivado: `stock` ou soma de `variations[].stock`; usado em listagem/filtros/alertas |
| `lowStockThreshold` | number | default 5; alerta de estoque baixo por produto |
| `variations` | array\<Variação\> | ver abaixo; vazio = produto simples |
| `variationSkus` | array\<string\> | derivado: SKUs das variações, p/ validar unicidade global |
| `status` | `"ativo"` \| `"inativo"` \| `"rascunho"` | publicar (`ativo`) exige nome, preço, ≥ 1 imagem e estoque definido |
| `destaque` | boolean | existente (feature 002) — inalterado |
| `deleted` | boolean | default `false`; **toda listagem filtra** `deleted == false` (R-7) |
| `deletedAt` | Timestamp \| null | auditoria do soft delete |
| `createdAt` / `updatedAt` | Timestamp | `serverTimestamp()` |

**Variação** (objeto no array `variations`, R-1):

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | gerado no cliente (uuid curto), estável |
| `attributes` | map\<string,string\> | ex.: `{tamanho: "M", cor: "azul"}` |
| `sku` | string | único no catálogo (junto com SKUs de produtos) |
| `price` | number (centavos) \| null | null = herda `price` do produto |
| `stock` | number ≥ 0 | estoque próprio da variação |

**Transições de status**: `rascunho → ativo` (se passa na validação de publicação),
`rascunho ↔ inativo`, `ativo ↔ inativo`. Exclusão: qualquer status → `deleted: true` (com pedidos)
ou remoção física (sem pedidos).

## Coleção `categories`

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | obrigatório |
| `nameLower` | string | derivado |
| `slug` | string | derivado de `name` (`utils/slugify`), único |
| `description` | string \| null | opcional |
| `image` | string (URL) \| null | opcional (Cloudinary) |
| `parentId` | string \| null | `null` = categoria raiz; preenchido = subcategoria (máx. 2 níveis: `parentId` deve apontar para categoria com `parentId == null` — validado no service) |
| `createdAt` | Timestamp | |

**Exclusão**: bloqueada se `products where categoryId == {id} and deleted == false limit 1`
retornar algo, ou se possuir subcategorias; a UI oferece mover produtos (update em lote de
`categoryId`/`categoryName`) antes.

## Coleção `orders`

Itens são **cópia congelada** do momento da compra (FR-053) — nunca referência viva ao produto.

| Campo | Tipo | Regras |
|---|---|---|
| `orderNumber` | number | sequencial via `counters/orders` na transação (R-14); exibido `#000123` |
| `customerId` | string (uid) | ref lógica `users` |
| `customerName` / `customerNameLower` / `customerEmail` | string | desnormalizados p/ listagem e busca |
| `shippingAddress` | map | `{rua, numero, complemento, bairro, cidade, uf, cep}` — cópia do endereço no momento |
| `paymentMethod` | string | ex.: `"pix"`, `"cartao"`, `"boleto"` (dados existentes; sem integração real) |
| `items` | array\<ItemPedido\> | ≥ 1 |
| `productIds` | array\<string\> | derivado: ids dos produtos dos itens; habilita `array-contains` p/ soft delete (R-7) |
| `subtotal` / `total` | number (centavos) | soma dos itens (frete fora do escopo) |
| `status` | enum (abaixo) | transições validadas no service **e** nas rules |
| `statusHistory` | array\<{status, at: Timestamp, byUid, byName, reason?}\> | append-only; `reason` obrigatório em cancelamento |
| `trackingCode` | string \| null | editável pelo admin |
| `internalNotes` | string \| null | editável pelo admin |
| `createdAt` | Timestamp | |

**ItemPedido**: `{productId, variationId?, name, variationLabel?, unitPrice (centavos, do momento),
quantity, imageUrl}`.

**Ciclo de vida (FR-051)** — mapa de transições em `constants/orderStatus.js`:

```text
aguardando_pagamento → pago | cancelado
pago                 → em_separacao | cancelado
em_separacao         → enviado | cancelado
enviado              → entregue
entregue             → devolvido
cancelado            → (terminal)
devolvido            → (terminal)
```

Efeitos colaterais transacionais (R-3): criação decrementa estoque + incrementa `dailyStats` +
agregados do cliente; `→ cancelado` e `→ devolvido` devolvem estoque + subtraem `dailyStats` +
ajustam agregados do cliente — sempre na mesma transação da mudança de status (SC-009).

## Coleção `users`

Fonte única de identidade (R-4, R-15). Criado no registro da loja (`role: "customer"`); o primeiro
admin é promovido manualmente no console (premissa da spec).

| Campo | Tipo | Regras |
|---|---|---|
| `name` / `nameLower` | string | |
| `email` | string | busca exata |
| `role` | `"admin"` \| `"customer"` (futuro: `"operator"`) | consultado pelas rules; permissões por funcionalidade em `constants/roles.js` |
| `addresses` | array\<Endereço\> | mesmos campos de `shippingAddress` |
| `orderCount` | number | agregado mantido na transação do pedido |
| `totalSpent` | number (centavos) | idem; cancelamento/devolução subtraem |
| `createdAt` | Timestamp | |

## Coleção `dailyStats` (R-2)

ID do documento = `yyyy-mm-dd` (fuso America/Sao_Paulo — premissa da spec). Mantida exclusivamente
por transações do `orderService`; leitura livre para admin.

| Campo | Tipo | Descrição |
|---|---|---|
| `revenue` | number (centavos) | faturamento líquido do dia |
| `orderCount` | number | pedidos do dia (líquido de cancelamentos) |
| `unitsSold` | number | unidades vendidas |
| `unitsByProduct` | map\<productId, {name, units}\> | alimenta top-5 e relatório de produtos |
| `updatedAt` | Timestamp | |

## Coleção `counters`

`counters/orders { current: number }` — incrementado na transação de criação de pedido (R-14).

## Relações (lógicas — sem FK no Firestore)

```text
users 1 ─── n orders            (customerId; nome/email desnormalizados no pedido)
categories 1 ─── n products     (categoryId; nome desnormalizado no produto)
categories 1 ─── n categories   (parentId, máx. 2 níveis)
products  n ─── n orders        (via cópia congelada em items[] + productIds[] p/ consulta)
orders    n ─── 1 dailyStats    (agregação por dia do createdAt)
```

## Validações centralizadas nos services

- SKU único (produto + variações): consulta `products` por `sku`/`variationSkus` antes de gravar.
- Promoção: `promoPrice < price` e `promoEnd > promoStart`.
- Publicação: nome + preço + ≥ 1 imagem + estoque definido (FR-029).
- Transição de status de pedido: mapa de `constants/orderStatus.js` (FR-051).
- Estoque ≥ 0 garantido por transação (nunca por validação de UI apenas) — FR-056.
- Hierarquia de categoria: máx. 2 níveis (FR-041).
