# Contracts: Rules e Índices do Firestore (Vitrine)

**Feature**: 005-vitrine-completa | **Date**: 2026-07-12

## Auditoria de rules (FR-015 / SC-008) — antes de codar

Estado **atual** (pós-feature 003/004), a reconfirmar sem alterar:

| Coleção | read público | write |
|---|---|---|
| `products` | **somente** `status == "ativo" && deleted == false` | admin |
| `categories` | público | admin |
| `orders`, `users`, `dailyStats`, `counters` | negado ao público (admin/dono) | admin |
| `settings` | público (aparência) | admin |

**Conclusão da auditoria**: a vitrine é atendida pela leitura pública já existente. O campo novo
`searchKeywords` é gravado **pelo admin** (cai em `products … allow write: if isAdmin()`), portanto
**nenhuma escrita pública nova é introduzida** — FR-015 satisfeito sem mudar `firestore.rules`. A
tarefa de auditoria confirma no Rules Playground que um usuário anônimo: (a) lê produto ativo; (b)
é **negado** ao ler produto inativo (base do 404 de `getPublicProduct`); (c) não consegue gravar
`searchKeywords`.

> Nenhuma alteração em `firestore.rules` é necessária para esta feature. Se a auditoria revelar
> qualquer divergência do quadro acima, tratar como bug antes de codar a vitrine.

## Índice novo em `firestore.indexes.json`

A busca da vitrine consulta `searchKeywords array-contains` + igualdades + ordenação por data:

| # | Coleção | Campos | Consulta |
|---|---|---|---|
| N1 | `products` | `deleted ASC, status ASC, searchKeywords ARRAY_CONTAINS, createdAt DESC` | busca pública por termo, só ativos, mais recentes primeiro |
| N2 | `products` | `deleted ASC, status ASC, categoryId ASC, searchKeywords ARRAY_CONTAINS, createdAt DESC` | busca **combinada com filtro de categoria** (US3-S3 / FR-013) |

Notas:

- Um `array-contains` conta como o único operador de array/range da consulta; combinar com os
  filtros de igualdade (`deleted`, `status`, e opcionalmente `categoryId`) e `orderBy(createdAt)`
  exige os índices compostos acima.
- **Busca + filtro de categoria** é **suportada no M1** (US3-S3 é acceptance do lojista): sem
  categoria usa N1, com categoria usa N2. Ambos declarados em `firestore.indexes.json` (tarefa
  T019).
- **Busca + ordenação por preço/nome NÃO é oferecida no M1**: durante busca ativa a ordenação é
  fixa em `createdAt` (relevância/recência) — combinar `array-contains` com `orderBy(price)`/
  `orderBy(nameLower)` exigiria um índice por ordenação e não agrega valor suficiente no M1
  (FR-013 relaxado nesse sentido; R-9).
- As **ordenações do catálogo** (sem busca) reusam os índices já presentes
  `deleted+status+{createdAt,price,nameLower}` e `deleted+categoryId+status+{...}`; direções
  inversas (preço↓, nome Z–A) são servidas pela reversão de índice do Firestore (só igualdades
  antes do trailing `orderBy`) — **sem índice novo** (research R-9). Confirmar rodando cada
  ordenação.

## Deploy

```powershell
npx firebase-tools deploy --only firestore:indexes --project versa-store-2eb1a
```

O índice N1 leva alguns minutos para construir; a busca retorna erro `failed-precondition` até o
build terminar (a UI trata como erro com "tentar novamente"). Rules **não** são redeployadas (sem
mudança).
