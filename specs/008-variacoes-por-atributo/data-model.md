# Data Model — Variações por Atributo (008)

Mudança **aditiva** na coleção `products`. Sem novas coleções. Variações seguem embutidas.

## Produto (`products/{id}`) — campos afetados/novos

| Campo | Tipo | Notas |
|---|---|---|
| `attributes` | `Array<{ name: string, values: string[] }>` | **NOVO**. Lista **ordenada** de atributos; cada um com nome e lista **ordenada** de valores permitidos. Vazio/ausente = produto simples. Ex.: `[{name:"Tamanho",values:["P","M","G","GG"]},{name:"Cor",values:["preta","azul"]}]`. |
| `variations` | `Array<Variation>` | Existente. Agora cada variação cobre exatamente as chaves de `attributes` (ver abaixo). |
| `variationsInconsistent` | `boolean` | **NOVO (derivado)**. `true` quando as variações violam a consistência (vazio / conjunto divergente / combinação duplicada) ou discordam de `attributes`. Recalculado em todo save e na migração. |
| `variationIssues` | `string[]` | **NOVO (derivado)**. Motivos legíveis para o alerta do admin (ex.: "variação sem valor de Cor", "combinação P/preta duplicada"). |
| `stock` | number \| null | Existente. Usado só quando produto simples (`attributes` vazio). |
| `totalStock` | number | Existente (derivado). Soma dos estoques das variações, ou `stock` quando simples. |
| `status` | `rascunho\|ativo\|inativo` | Existente. **Não** é alterado pela sinalização de inconsistência. |
| `incomplete` / `incompleteFields` | boolean / string[] | Existentes (alerta "cadastro incompleto"). O novo flag de inconsistência é **independente** e coexiste no card de Alertas. |

## Variação (`products.variations[i]`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | **Identidade estável** (R-2). Preservado através de qualquer edição enquanto a combinação existir. Nova combinação → id novo. Fusão (FR-008a) → o lojista escolhe o id sobrevivente. |
| `attributes` | `{ [attrName]: string }` | Um valor por atributo declarado do produto, escolhido de `product.attributes[k].values`. Mesmo conjunto de chaves em todas as variações. |
| `stock` | number | Por variação. |
| `price` | number \| null | Opcional; vazio herda o preço do produto. |
| `sku` | string | Único no catálogo (regra existente `variationSkus`). |

**Regras de integridade (validadas no admin e pela migração):**
- Toda variação tem exatamente as chaves de `product.attributes` (nem falta, nem sobra), todas com valor não vazio pertencente à lista de valores do atributo. (FR-002)
- A combinação de valores é única entre as variações do produto. (FR-006b)
- Produto `ativo` MUST ser consistente (senão publicar é bloqueado). (FR-007)
- Ordem de exibição dos valores = ordem em `product.attributes[k].values`. (FR-002a)

## Entidades já existentes — invariantes preservadas (não mudam de forma)

- **Item de pedido congelado** (`orders.items[i]`): guarda `variationId`, `variationLabel`, `unitPrice`, etc., **congelados na compra**. Imutável; a mudança de modelo não o toca (FR-018/SC-008). O `variationLabel` histórico permanece exatamente como gravado.
- **Item de carrinho** (localStorage, feature 006): `lineId = productId::variationId`. A revalidação resolve a variação por `variationId` no produto atual; ids estáveis (R-2) evitam descartar itens válidos (FR-019).

## Estados / transições relevantes

- **Consistente ↔ inconsistente**: derivado a cada save/migração. Passar a consistente (via edição válida) remove `variationsInconsistent` e o produto reaparece na vitrine se `ativo`.
- **Publicar**: `rascunho/inativo → ativo` só é permitido se consistente (FR-007). `ativo` pode virar inconsistente apenas por dado legado sinalizado na migração (fica oculto na vitrine + alertado no admin até correção).
- **Remoção de atributo/valor com colapso de combinação**: exige resolução explícita (id sobrevivente / somar estoques) antes de persistir (FR-008a / R-6).

## Índices (firestore.indexes.json)

- **Adicionar** `variationsInconsistent (==)` às consultas públicas (`listPublicProducts`, `getFeaturedProducts`) que já filtram `deleted (==)` + `status (==)` [+ `categoryId`] [+ `searchKeywords array-contains`] + `orderBy`. Igualdade extra por combinação pública (R-4). `getPublicProduct` não precisa de índice (checa o campo em memória e retorna `null`).
- Consultas do **admin** (`listProducts`) não filtram por inconsistência (o admin PRECISA ver os sinalizados) → sem novos índices no admin.
