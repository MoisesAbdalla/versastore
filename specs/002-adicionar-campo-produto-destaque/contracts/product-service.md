# Contrato: `frontend/src/services/productService.js`

Este projeto não tem uma API própria — o Firestore é acessado diretamente pelo frontend através
deste serviço. Este documento é o contrato desse serviço (a "API" de fato do app para dados de
produto), incluindo o que já existe e o que esta feature adiciona.

## `createProduct(product)` — já existente, inalterado

**Input**: `{ name, category, price, stock, description, image, destaque }` — `destaque` passa a
ser enviado por quem chama (o formulário de cadastro), com `false` como valor padrão quando o
checkbox não está marcado (FR-002). Sem input novo obrigatório além disso.

**Output**: `id` (string) do documento criado.

**Erros**: propaga qualquer erro do Firestore (já é o comportamento atual, tratado com `alert` no
formulário de cadastro).

---

## `getFeaturedProducts()` — novo

**Input**: nenhum.

**Output**: `Promise<Product[]>` — array dos produtos com `destaque == true`, cada item incluindo o
`id` do documento. **Ordem não é garantida/relevante** (quem chama é responsável por embaralhar —
ver research.md §2, feito em `FeaturedProducts`, não no serviço).

**Erros**: se a consulta falhar (ex.: sem conexão), a Promise rejeita; quem chama (Home) MUST tratar
essa rejeição sem quebrar a página (Edge Case do spec) — ex.: capturar o erro e cair no mesmo estado
vazio ("Em breve") ou um estado de erro equivalente.

---

## `getProducts()` — novo

**Input**: nenhum.

**Output**: `Promise<Product[]>` — todos os produtos cadastrados, cada item incluindo o `id`. Usado
pela listagem do Admin (FR-003).

**Erros**: propaga erro do Firestore; a tela de listagem MUST tratar (ex.: mensagem de erro simples,
sem quebrar o Admin).

---

## `getProduct(id)` — novo

**Input**: `id` (string, id do documento).

**Output**: `Promise<Product | null>` — o produto correspondente (com `id`), ou `null` se não
existir (ex.: id inválido/produto excluído por fora do app).

**Erros**: propaga erro do Firestore; a tela de edição MUST tratar (ex.: mensagem "produto não
encontrado" quando `null`).

---

## `updateProduct(id, changes)` — novo

**Input**: `id` (string), `changes` (objeto parcial — só os campos alterados: qualquer subconjunto
de `name, category, price, stock, description, image, destaque`).

**Output**: `Promise<void>`.

**Comportamento**: MUST atualizar somente os campos presentes em `changes` (via `updateDoc`, que já
faz merge parcial nativamente) — campos ausentes em `changes` MUST permanecer intocados no
documento (FR-003b). Quando `changes.image` estiver ausente (admin não trocou a imagem — FR-003c), o
chamador (tela de edição) MUST simplesmente não incluir `image` em `changes`, e não re-enviar a URL
atual desnecessariamente (embora reenviar o mesmo valor também seria inofensivo).

**Erros**: propaga erro do Firestore; a tela de edição MUST tratar (ex.: `alert` de erro, mesmo
padrão do cadastro).

**Nota de conformidade (Constituição II)**: qualquer alteração que inclua `changes.stock` MUST ter
cobertura de teste automatizado antes de ser considerada pronta — é a função core do "MUST ter teste
automatizado" definido em plan.md.
