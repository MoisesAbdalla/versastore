# Data Model — Avaliações de Produtos (015)

## Coleção `reviews` (NOVA)

Doc id = **`${productId}_${uid}`** (garante 1 por produto/cliente; validado nas rules).

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `productId` | string | sim | produto avaliado |
| `userId` | string | sim | == uid do autor (rules: isSelf) |
| `userName` | string | sim | nome/primeiro nome do autor, denormalizado p/ exibir (nunca e-mail) |
| `rating` | number (int) | sim | 1–5 |
| `comment` | string | não | texto; limite de caracteres (ver constants/review.js); pode ser "" |
| `status` | string | sim | `"pendente"` \| `"aprovada"` \| `"oculta"`. Nasce `pendente`. |
| `createdAt` | Timestamp | sim | `serverTimestamp()` na criação |
| `updatedAt` | Timestamp | sim | `serverTimestamp()` a cada gravação |

**Regras de transição de status**:
- cliente cria → `pendente`; cliente edita (nota/comentário) → volta a `pendente` (mesmo se estava `aprovada`).
- admin: `pendente`→`aprovada` (aprovar), `*`→`oculta` (ocultar), delete (remover).

**Validação (`validateReview`)**: `rating` inteiro 1–5 (obrigatório); `comment` até o limite; ambos aparados.

## Produto (`products/*`) — campos aditivos (escrita ADMIN)

| Campo | Tipo | Notas |
|---|---|---|
| `ratingAvg` | number | média (0–5, 1 casa) das avaliações **aprovadas**; 0 se nenhuma |
| `ratingCount` | number | nº de avaliações **aprovadas**; 0 se nenhuma |

Recalculados por `recomputeProductRating(productId)` (admin) após aprovar/ocultar/remover. Produtos legados sem os campos → tratados como 0 na exibição (`?? 0`).

## Transições que tocam avaliação

| Momento | Efeito | Onde |
|---|---|---|
| Cliente envia/edita | `setDoc(reviews/{pid_uid}, {status:"pendente", ...})` | `reviewService.submitReview` |
| Cliente carrega a própria | `get(reviews/{pid_uid})` | `reviewService.getMyReview` |
| Página lista aprovadas | query `productId== & status=="aprovada"` orderBy createdAt, limit+cursor | `reviewService.getApprovedReviews` |
| Elegibilidade | query `orders` `customerId== & productIds array-contains pid` limit 1 | `reviewService.hasPurchased` |
| Admin lista pendentes | query `status=="pendente"` (sort client) | `reviewService.listReviews` |
| Admin aprova/oculta | `update(reviews/{id}, {status})` + `recomputeProductRating` | `reviewService.approve/hideReview` |
| Admin remove | `delete(reviews/{id})` + `recomputeProductRating` | `reviewService.deleteReview` |

## Índices (firestore.indexes.json) — 2 novos, DEPLOY MANUAL

1. `reviews`: `productId` ASC, `status` ASC, `createdAt` DESC (lista de aprovadas por produto, paginada).
2. `orders`: `customerId` ASC, `productIds` ARRAY_CONTAINS (verificação de compra).

## Regras (firestore.rules) — bloco novo, DEPLOY MANUAL

Ver `contracts/services.md` / research R-5: leitura só das aprovadas (ou própria/admin); create próprio como `pendente` com id `productId_uid` e nota 1–5; update admin **ou** próprio voltando a `pendente`; delete admin. `products` **não muda** (agregado é escrita admin).
