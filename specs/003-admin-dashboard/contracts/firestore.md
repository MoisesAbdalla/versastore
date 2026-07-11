# Contracts: Segurança e índices do Firestore

**Feature**: 003-admin-dashboard | **Date**: 2026-07-11

## Arquivos versionados e deploy

As regras e os índices são **arquivos versionados no repositório** (raiz):

```text
firebase.json            # { "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" } }
firestore.rules
firestore.indexes.json
```

Deploy (sem instalar dependência no projeto — `firebase-tools` roda via npx):

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Mudança em regra ou índice = mudança nesses arquivos + redeploy; nunca editar direto no console
(o arquivo versionado é a fonte de verdade). Criação dos três arquivos e o primeiro deploy são
tarefas de fundação no tasks.md.

## firestore.rules — contrato das regras

Princípios (FR-001/002, research R-4):

- A proteção vive na **camada de dados**, não apenas no `AdminRoute` do cliente.
- Papel lido de `users/{uid}.role` via `get()` — revogação vale na próxima operação, sem novo login.
- Regra é **deny by default**: tudo que não está explicitamente permitido é negado.

Contrato por coleção (pseudocódigo das rules; a implementação usa funções auxiliares
`isSignedIn()`, `isAdmin()`, `isSelf(uid)`):

| Coleção | read | write |
|---|---|---|
| `products` | pública **somente** `status == "ativo" && deleted == false` (loja); admin lê tudo | somente admin |
| `categories` | pública (loja usa para navegação) | somente admin |
| `orders` | admin; cliente lê apenas os próprios (`customerId == request.auth.uid`) | somente admin (criação de pedido pela loja entra quando o checkout existir — fora do escopo) |
| `users` | admin lê todos; usuário lê o próprio doc | admin escreve `role`; usuário edita o próprio doc **exceto** `role`, `orderCount`, `totalSpent` |
| `dailyStats` | somente admin | somente admin |
| `counters` | somente admin | somente admin |

Regras adicionais de integridade (defesa em profundidade — a validação principal é dos services):

- `orders`: update não pode alterar `items`, `orderNumber`, `customerId`, `createdAt`
  (`request.resource.data.diff(resource.data)` restrito a `status`, `statusHistory`,
  `trackingCode`, `internalNotes`).
- `users` — **escalação de privilégio bloqueada**: um usuário NUNCA pode alterar o próprio `role`
  (nem os agregados `orderCount`/`totalSpent`, que só as transações de pedido mantêm). Contrato
  explícito da rule de update do próprio documento:

  ```text
  allow update: if isSelf(userId)
    && request.resource.data.role == resource.data.role
    && request.resource.data.orderCount == resource.data.orderCount
    && request.resource.data.totalSpent == resource.data.totalSpent;
  // criação do próprio doc (registro na loja) força papel de cliente:
  allow create: if isSelf(userId) && request.resource.data.role == "customer";
  // somente admin altera role de qualquer usuário:
  allow write: if isAdmin();
  ```

  Cenário de teste obrigatório no Rules Playground: usuário autenticado tenta
  `update users/{seu-uid}` com `role: "admin"` → **negado**.

**Validação das rules**: nesta fase (sem emulador no CI), as rules são exercitadas manualmente via
Rules Playground do console Firebase com os cenários do quickstart.md §1; adotar
`@firebase/rules-unit-testing` + emulador fica registrado como melhoria futura.

## firestore.indexes.json (índices compostos exigidos — research R-8)

Toda consulta com igualdade + `orderBy` em campo distinto exige índice composto. Lista mínima:

| # | Coleção | Campos | Consulta que atende |
|---|---|---|---|
| 1 | `products` | `deleted ASC, createdAt DESC` | listagem padrão do painel |
| 2 | `products` | `deleted ASC, status ASC, createdAt DESC` | filtro por status |
| 3 | `products` | `deleted ASC, categoryId ASC, createdAt DESC` | filtro por categoria |
| 4 | `products` | `deleted ASC, nameLower ASC` | busca por prefixo de nome + ordenação alfabética |
| 5 | `products` | `deleted ASC, skuUpper ASC` | busca por SKU |
| 6 | `products` | `deleted ASC, price ASC` / `DESC` | ordenação por preço |
| 7 | `products` | `deleted ASC, totalStock ASC` | filtro/ordenação por faixa de estoque + alertas de estoque baixo (`totalStock <= threshold`) |
| 8 | `products` | `deleted ASC, status ASC, descriptionText ASC` (ou consulta por flag derivada `incomplete`) | alerta de produto incompleto — decidir na implementação a forma mais barata |
| 9 | `products` | `destaque ASC, deleted ASC` | home da loja (featured) mantendo filtro de excluídos |
| 10 | `orders` | `status ASC, createdAt DESC` | filtro por status |
| 11 | `orders` | `customerId ASC, createdAt DESC` | pedidos do cliente (detalhe do cliente / minha conta) |
| 12 | `orders` | `customerNameLower ASC, createdAt DESC` | busca por nome do cliente |
| 13 | `orders` | `productIds array-contains, createdAt DESC` | checagem de soft delete (limit 1 — o índice single-field de array já cobre; listado por clareza) |
| 14 | `users` | `role ASC, createdAt DESC` | listagem de clientes |
| 15 | `users` | `role ASC, nameLower ASC` | busca de cliente por nome |
| 16 | `users` | `role ASC, totalSpent DESC` | ordenação por total gasto |

Notas:

- Ordenações da UI ficam **restritas** às combinações acima (R-8); coluna sem índice não oferece
  ordenação server-side.
- `dailyStats` não precisa de índice composto: a consulta de período é range sobre o ID do
  documento (`FieldPath.documentId()`).
- Índices single-field automáticos cobrem `orderNumber ==`, `email ==` e `slug ==`.
- Busca combinando **prefixo + outro filtro + outra ordenação** não é suportada pelo Firestore
  (um único campo de range por consulta) — na UI, busca textual zera os demais filtros
  (limitação documentada, R-5).
