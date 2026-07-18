# Contracts — Serviços & Utilitários (015)

## `utils/rating.js` (NOVO — puro, testável)

```js
// Média das notas de uma lista de avaliações (0 se vazia), arredondada a 1 casa.
export function averageOf(reviews): number

// Arredonda para a meia-estrela mais próxima (p/ exibição): 4.3→4.5, 4.1→4.0.
export function roundHalf(value): number

// Quebra a média em 5 estrelas para render: ["full","full","full","half","empty"].
export function starBreakdown(avg): Array<"full"|"half"|"empty">

// Valida o formulário. comment aparado; rating inteiro 1–5.
export function validateReview({ rating, comment }):
  { ok: boolean, errors: { rating?, comment? } }
```

## `constants/review.js` (NOVO)

```js
export const REVIEW_STATUS = { PENDENTE: "pendente", APROVADA: "aprovada", OCULTA: "oculta" };
export const REVIEW_STATUS_LABELS = { pendente: "Pendente", aprovada: "Aprovada", oculta: "Oculta" };
export const COMMENT_MAX = 500;
```

## `services/reviewService.js` (NOVO)

```js
function reviewId(productId, uid): string  // `${productId}_${uid}`

// --- Cliente ---
// Cria/edita a própria avaliação (sempre status pendente). userName denormalizado.
export async function submitReview({ productId, uid, userName, rating, comment }): Promise<void>

// Minha avaliação (qualquer status) ou null.
export async function getMyReview(productId, uid): Promise<Review|null>

// Aprovadas de um produto, paginadas (limit + cursor); orderBy createdAt desc.
export async function getApprovedReviews(productId, { pageSize = 10, cursor = null }):
  Promise<{ items: Review[], nextCursor, hasMore }>

// Elegibilidade "comprou": pedido não cancelado com o produto.
export async function hasPurchased(uid, productId): Promise<boolean>

// --- Admin ---
export async function listReviews({ status = "pendente" }): Promise<Review[]>  // sort client
export async function approveReview(id): Promise<void>   // status aprovada + recompute
export async function hideReview(id): Promise<void>      // status oculta + recompute
export async function deleteReview(id): Promise<void>    // delete + recompute
export async function recomputeProductRating(productId): Promise<void>  // média das aprovadas → produto
```

`Review` = shape do data-model (com `id`).

## `hooks/useProductReviews.js` (NOVO)

```js
// Para a página do produto. Carrega aprovadas (paginado), minha avaliação e a
// elegibilidade; expõe submit (revalida a própria) e loadMore.
export function useProductReviews(productId):
  { reviews, hasMore, loadMore, loading,
    myReview, canReview, eligibilityLoading,
    submit({ rating, comment }), submitting, submitError }
// canReview = logado && hasPurchased && (sem review OU editando a própria)
```

## `firestore.rules` (ALTERADO — deploy manual)

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
                  && request.resource.data.status == "pendente"
                  && request.resource.data.rating >= 1 && request.resource.data.rating <= 5 );
  allow delete: if isAdmin();
}
```
`products` **não muda** (o agregado `ratingAvg`/`ratingCount` é escrita admin via `recomputeProductRating`).

## `firestore.indexes.json` (ALTERADO — deploy manual)

- `reviews`: (`productId` ASC, `status` ASC, `createdAt` DESC).
- `orders`: (`customerId` ASC, `productIds` ARRAY_CONTAINS).

## Testes (Princípio II — toca a média exibida e a moderação)

- `utils/__tests__/rating.test.js`: averageOf (vazio→0, arredondamento 1 casa); roundHalf; starBreakdown (full/half/empty); validateReview (rating fora de 1–5, comentário acima do limite, ok).
- `services/__tests__/reviewService.test.js` (Firestore mockado): submitReview grava id determinístico + status pendente + updatedAt; getMyReview; approveReview/hideReview/deleteReview chamam recompute e atualizam ratingAvg/ratingCount só com aprovadas; hasPurchased true/false (array-contains, ignora cancelado); getApprovedReviews pagina.
