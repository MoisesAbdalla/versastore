# Contracts: Rules e Índices do Firestore (Conta do Cliente)

**Feature**: 007-conta-cliente | **Date**: 2026-07-13

## Auditoria de rules (FR-023 / SC — antes de codar)

Estado **atual** (pós-features 003–006), a reconfirmar **sem alterar**:

| Coleção | Ação do cliente | Regra vigente |
|---|---|---|
| `users/{uid}` | **create** do próprio doc | `isSelf(uid) && role == "customer"` ✅ |
| `users/{uid}` | **update** do próprio doc | `isSelf(uid)` e `role`/`orderCount`/`totalSpent` **inalterados** — logo `name`, `nameLower`, `phone`, `termsAcceptedAt`, `authProvider`, `addresses` são livres ✅ |
| `users/{uid}` | **read** do próprio doc | `isSelf(uid) || isAdmin()` ✅ |
| `orders` | **read** dos próprios | `isSignedIn() && resource.data.customerId == request.auth.uid` ✅ |
| `orders` | **write** | somente admin — o cliente **não** cria/edita pedidos no M3 ✅ |

**Conclusão**: todas as escritas do M3 são no próprio `users/{uid}` (campos fora do conjunto
congelado) e a leitura é dos próprios `orders` — **tudo já permitido**. **Nenhuma alteração em
`firestore.rules` é necessária.** A tarefa de auditoria confirma no Rules Playground:

- cliente autenticado **cria/edita** o próprio `users/{uid}` (add `phone`, `termsAcceptedAt`,
  `addresses`) → **Allow**;
- cliente tenta alterar o próprio `role`/`orderCount`/`totalSpent` → **Deny** (escalonamento
  bloqueado, já testado na 003);
- cliente **lê** um pedido próprio → **Allow**; pedido de **outro** `customerId` → **Deny** (base do
  `getMyOrder → null`, SC-006).

## Índices

Nenhum índice novo. "Meus pedidos" (`where customerId == uid, orderBy createdAt desc`) reusa o
índice **`orders (customerId ASC, createdAt DESC)`** já declarado em `firestore.indexes.json`
(feature 003). Confirmar rodando a listagem de um cliente com pedidos.

## Dependência externa (leitura)

ViaCEP (`viacep.com.br`) — serviço público de leitura, sem autenticação, isolado no `cepService`.
Não integra com Firestore; falha cai para preenchimento manual. Fora do escopo de rules.

## Passo operacional (console, não é deploy de código)

Habilitar o **provedor Google** em Firebase Console → Authentication → Sign-in method → Google
(passo do lojista, documentado no quickstart). `localhost` já é domínio autorizado por padrão para
desenvolvimento; o domínio de produção entra quando o M7 publicar.
