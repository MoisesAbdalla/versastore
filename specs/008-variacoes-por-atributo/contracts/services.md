# Contracts — Serviços e migração (008)

## `utils/variationValidation.js` (NOVO — regra única, reusada por form, service e backfill)

- `validateVariations(product) -> { ok, issues: string[] }`
  - `issues` não vazio quando: alguma variação tem chave de atributo faltando ou valor vazio; conjunto de chaves difere entre variações ou de `product.attributes`; combinação de valores duplicada; valor fora da lista permitida do atributo.
  - Produto simples (`attributes` vazio, sem variações) → `{ ok: true, issues: [] }`.
- `deriveAttributesFromVariations(variations) -> { attributes, inconsistent, issues }` (usado pela migração): conjunto = chaves presentes e não vazias em **todas** as variações; `values` por atributo = distintos na ordem de primeira aparição; `inconsistent = true` (com motivo) se as variações discordam. **Não** inventa valores.
- `detectMergeConflicts(prevVariations, nextAttributes) -> Array<{ combination, variationIds }>`: grupos de variações que colapsariam na mesma combinação após a mudança de atributos/valores (para o passo de resolução do editor — FR-008a).

Testes: vazio, faltando chave, conjunto divergente, duplicado, valor fora da lista, produto simples; deriveAttributes idempotente; detectMergeConflicts para remoção de atributo e de valor.

## `services/productService.js` (ALTERADO)

- `withDerivedFields(data)`: passa a computar `variationsInconsistent` + `variationIssues` via `validateVariations` (mesmo lugar do `incomplete`). Escreve `attributes` como recebido.
- `validateProduct(data)`: se `status === ativo` e `validateVariations` falha → lança `serviceError("variacoes-inconsistentes", <mensagem do que corrigir>)` (bloqueia publicar — FR-007). Mantém as validações atuais (promoção, SKU único).
- `listPublicProducts(...)` / `getFeaturedProducts()`: adicionam `where("variationsInconsistent","==",false)`.
- `getPublicProduct(id)`: retorna `null` também quando `data.variationsInconsistent === true` (além de deleted/não-ativo).
- **Estabilidade de id (R-2)**: `createProduct`/`updateProduct` persistem as variações com os ids fornecidos pelo form (que reusa os ids existentes). O service não regenera ids.

Testes: publicar inconsistente é bloqueado; `getPublicProduct` esconde inconsistente; derived flag setado/limpo conforme validade; SKU/promoção intactos.

## `services/orderService.js` (SEM mudança de atomicidade — confirmar + testar)

- `createOrder(...)`: comportamento atual mantido — dentro da `runTransaction`, relê `products/{id}`, resolve por `variationId`, aborta `nao-encontrado` se a variação sumiu e `estoque-insuficiente` se faltou estoque (R-3).
- **Novo teste (NON-NEGOTIABLE, toca estoque)**: cliente compra `variationId` X; entre a montagem do carrinho e o commit, o produto é atualizado removendo X → a transação aborta com `nao-encontrado`, **sem** baixar estoque de outra variação. E: X continua existindo com mesmo id após edição cosmética (reordenar/renomear/adicionar atributo) → compra conclui.

## `dev/backfillVariations.js` (NOVO — idempotente, padrão `backfillSearchKeywords`)

- `backfillVariations()` (dev, admin, console): para cada produto, usa `deriveAttributesFromVariations`; grava `attributes` + `variationsInconsistent`/`variationIssues` **só se mudou** (idempotente); nunca altera as variações de produtos inconsistentes (apenas sinaliza). Loga `{ updated, flagged, skipped }`.

Testes: produto 2-atributos consistente → recebe `attributes` corretos e 2ª execução é no-op; produto inconsistente → `variationsInconsistent=true` e variações intactas; produto simples → `attributes: []`.
