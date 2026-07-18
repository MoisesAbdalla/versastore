# Research — Avaliações de Produtos (015)

Decisões (Fase 0). Formato: Decisão / Racional / Alternativas.

## R-1 — Coleção `reviews` com id determinístico `productId_uid`

**Decisão**: uma coleção `reviews`; cada doc tem id = `${productId}_${uid}`. Campos: `productId`, `userId`, `userName`, `rating` (1–5), `comment`, `status` (`pendente`|`aprovada`|`oculta`), `createdAt`, `updatedAt`.

**Racional**: o id determinístico garante **uma avaliação por (produto, cliente)** sem query de unicidade — reenviar faz `setDoc` no mesmo doc (edita). As rules validam `reviewId == productId + "_" + uid`, impedindo o cliente criar várias para o mesmo produto. `get` por id é barato para carregar "minha avaliação".

**Alternativas**: subcoleção `products/{id}/reviews` — rejeitada (moderação global do admin precisaria de collectionGroup + índices; a coleção raiz é mais simples para a fila de pendentes). Id auto + query de unicidade — rejeitada (corrida + índice).

## R-2 — Pré-moderação; média aplicada pelo admin

**Decisão**: a avaliação nasce `pendente`. Só o **admin** muda `status` e **recalcula** `ratingAvg`/`ratingCount` do produto (a partir das avaliações **aprovadas**). O cliente nunca escreve o agregado do produto.

**Racional**: espelha o M4a (option C) e os cupons (013) — o cliente escreve só o próprio dado; o agregado sensível (a média que aparece na vitrine) é do admin, não forjável. Pré-moderação também barra conteúdo abusivo antes de aparecer.

**Alternativas**: pós-moderação com o cliente escrevendo a média — rejeitada no clarify (forjável, exigiria afrouxar as rules de `products`).

## R-3 — Recompute da média na moderação

**Decisão**: `recomputeProductRating(productId)` (admin): consulta as avaliações **aprovadas** do produto, calcula `ratingCount` e `ratingAvg` (média das notas, arredondada a 1 casa) e `updateDoc` no produto. Chamado após aprovar, ocultar ou remover.

**Racional**: recomputar a partir do conjunto aprovado é **sempre correto** (não acumula erro de deltas) e o volume por produto é pequeno. Não precisa de transação (é ação admin, sequencial). `products.update` já é `allow if isAdmin()` → sem mudança de regra para o agregado.

**Alternativas**: manter soma/contagem incremental — rejeitada (mais estados a manter em sincronia; recompute é trivial no volume esperado).

## R-4 — "Comprou" = pedido não cancelado com o produto (checagem no client)

**Decisão**: elegibilidade via `hasPurchased(uid, productId)`: consulta `orders` com `where customerId == uid && productIds array-contains productId` (limit 1), ignorando cancelados no client. Só mostra o formulário se verdadeiro.

**Racional**: usa o `productIds` que o pedido já grava (M4a). As rules não cruzam documentos, então a checagem é **no client e forjável** — dívida pré-lançamento, endurecida no M4b (webhook/servidor confiável), como as demais. Como o M4a permite o admin marcar pedidos como pago/entregue, há compras utilizáveis mesmo sem o M4b.

**Alternativas**: exigir status `entregue` — rejeitada por ora (trava demais no pré-lançamento; "não cancelado" é suficiente e simples). Ler todos os pedidos e filtrar no client — rejeitada (a query `array-contains` é direta com 1 índice).

## R-5 — Leitura pública só das aprovadas; regras da coleção

**Decisão** (`firestore.rules`):
```
match /reviews/{reviewId} {
  allow read:   if resource.data.status == "aprovada"
                || (isSignedIn() && resource.data.userId == request.auth.uid)
                || isAdmin();
  allow create: if isSelf(request.resource.data.userId)
                && reviewId == request.resource.data.productId + "_" + request.auth.uid
                && request.resource.data.status == "pendente"
                && request.resource.data.rating is int
                && request.resource.data.rating >= 1 && request.resource.data.rating <= 5;
  allow update: if isAdmin()
                || ( isSelf(resource.data.userId)
                  && request.resource.data.userId == resource.data.userId
                  && request.resource.data.status == "pendente"   // editar → volta a pendente
                  && request.resource.data.rating >= 1 && request.resource.data.rating <= 5 );
  allow delete: if isAdmin();
}
```

**Racional**: público lê só aprovadas; o autor lê/edita a própria (sempre voltando a `pendente` — não pode se auto-aprovar); admin modera. A query pública **precisa** filtrar `status == "aprovada"` para satisfazer a regra de list. `products` **não muda** (agregado é escrita admin).

**Alternativas**: leitura pública de tudo com filtro só no client — rejeitada (vazaria pendentes/ocultas).

## R-6 — Índices (2 novos, deploy manual)

**Decisão**: adicionar em `firestore.indexes.json`:
1. `reviews`: `productId` ASC, `status` ASC, `createdAt` DESC — lista de aprovadas por produto, paginada (página do produto).
2. `orders`: `customerId` ASC, `productIds` ARRAY_CONTAINS — verificação de compra.

Admin lista pendentes por `where status == "pendente"` (índice de campo único automático) e ordena no client — sem índice composto.

**Racional**: cobre as duas queries que combinam igualdade + ordenação/array. Deploy `firebase deploy --only firestore:indexes` é passo manual do lojista (como as rules).

## R-7 — Estrelas: componente único de exibição + util puro

**Decisão**: `utils/rating.js` (`averageOf`, `roundHalf`, `starBreakdown(avg)` → array de "full"/"half"/"empty", `validateReview({rating, comment})`); componente `StarRating` exibe as estrelas + contagem, reusado no `ProductCard` e na página. O formulário usa estrelas clicáveis (input) na seção de avaliações da página.

**Racional**: uma fonte de verdade para o cálculo/quebra das estrelas (testável), sem duplicar no card e na página (Princípio I/III).

## Resumo de impacto
- **Nova coleção `reviews`** + **regra nova** + **2 índices** (deploy manual). Produto ganha `ratingAvg`/`ratingCount` (aditivo, escrita admin).
- Cliente escreve só a própria avaliação (pendente); admin modera e aplica a média.
- Compra verificada é checagem client-side (forjável) → endurecida no M4b.
