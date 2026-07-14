# Research — Variações por Atributo (008)

Decisões de design (Fase 0). Formato: Decisão / Racional / Alternativas.

## R-1 — Modelo: atributos com valores ordenados no produto

**Decisão**: `product.attributes: [{ name, values: string[] }]` — lista **ordenada** de atributos, cada um com nome e **lista ordenada de valores permitidos**. Cada variação guarda `attributes: { [name]: value }` escolhendo um valor da lista permitida daquele atributo. Produto simples: `attributes: []` (ou ausente) → sem seletor, usa `stock` geral.

**Racional**: a decisão do `/clarify` (declarar valores, não derivar da digitação) resolve por construção a **ordem** (P M G GG) e a **consistência** (sem "preta"/"Preta"). O mapa `attributes` por variação já existe hoje, então adicionar `attributes[]` no produto é **aditivo**. O rótulo da variação (usado em carrinho/pedido) continua derivável de `Object.values(variation.attributes)` na ordem de `product.attributes`.

**Alternativas**: (a) `attributeNames: string[]` + valores livres por variação — rejeitada no clarify (ordem/typo). (b) coleção separada de variações — rejeitada: variações embutidas já funcionam e evitam N+1 e novas rules.

## R-2 — Identidade estável da variação (id preservado na edição)

**Decisão**: a **identidade** de uma variação é o `id`, nunca a combinação de valores. O editor do admin **reusa o `id`** existente ao editar (comportamento já presente: `formToProduct` mapeia `id: variation.id`); só gera `id` novo para linha nova. Reordenar valores/atributos, renomear atributo ou adicionar atributo **não** troca ids. Na fusão de combinações (R-6/FR-008a) o lojista escolhe qual `id` sobrevive.

**Racional**: o carrinho persistente (M2) usa `lineId = productId::variationId` e a revalidação (`CartContext.revalidate`) descarta a linha se `variationId` não existir mais no produto. Ids estáveis impedem que uma edição cosmética (reordenar, renomear atributo, adicionar Material) **derrube itens válidos** do carrinho do cliente. Também mantém pedidos e transações apontando para ids resolvíveis. Conecta com FR-018/FR-019.

**Alternativas**: id derivado da combinação (hash dos valores) — rejeitada: qualquer renomeação/reordenação mudaria o id e quebraria carrinho/pedido; e adicionar um atributo mudaria todas as combinações.

## R-3 — Concorrência: lojista edita × cliente compra

**Decisão**: **não** alterar a atomicidade de `createOrder`. A compra já roda em `runTransaction`, relê `products/{id}` **dentro** da transação, resolve a variação por `variationId` e:
- se a variação não existe mais → aborta com `nao-encontrado`/"Variação do produto não encontrada";
- se `stock < quantidade` → aborta com `estoque-insuficiente`.
Com ids estáveis (R-2), o caso comum (lojista editou preço/estoque/adicionou atributo) **mantém** a variação comprável; o caso raro (lojista removeu exatamente a variação sendo comprada) aborta a compra com erro claro, sem baixar estoque errado. A UI da página de produto trata o erro (mensagem + revalidar).

**Racional**: a serialização otimista do Firestore + a releitura na transação já dão o "read-modify-write" seguro. Reestruturar variações é uma escrita no mesmo doc `products/{id}` que a transação lê; a transação vê o estado commitado. Não há necessidade de lock nem de versionar o produto.

**Alternativas**: (a) travar edição enquanto há carrinho ativo — inviável (carrinho é client-side, distribuído). (b) versão/optimistic-lock explícito no produto — desnecessário: a transação de compra já relê e a de edição é um update simples; conflitos de escrita concorrente no mesmo doc são reexecutados pelo Firestore.

## R-4 — Esconder produto inconsistente da vitrine + alerta no admin

**Decisão**: campo derivado `variationsInconsistent: boolean` (+ `variationIssues: string[]` para a mensagem), recalculado em **todo** `withDerivedFields` (save do admin) e pela migração — mesmo padrão do `incomplete`/`incompleteFields` já existente.
- **Vitrine**: `getPublicProduct` retorna `null` quando `variationsInconsistent` (página some, 404 amigável — custo zero de índice); `listPublicProducts`/`getFeaturedProducts` adicionam `where("variationsInconsistent","==",false)` → **índices compostos adicionais** para as combinações públicas.
- **Admin (alerta impossível de ignorar)**: badge "Variação inconsistente" na linha da listagem; card de Alertas do dashboard com contador "N produtos ocultos por inconsistência de variação" (reusa o padrão `alerts.incompleteProducts`); mensagem clara na tela de edição do produto explicando o que corrigir.

**Racional**: publicar já é bloqueado para inconsistente (FR-007), então **active + inconsistente** só surge de dados legados até o lojista corrigir — volume baixo e transitório, minimizando a exposição e o churn de índices. O flag derivado mantém a regra num único lugar (util compartilhado), consistente com `computeIncompleteFields`.

**Alternativas**: (a) filtrar inconsistentes no cliente após paginar — rejeitada: quebra a contagem/paginação server-side. (b) mudar o `status` do produto ao sinalizar — rejeitada: alteraria silenciosamente o estado que o lojista definiu.

## R-5 — Migração idempotente + sinalização (backfillVariations)

**Decisão**: `dev/backfillVariations.js` no padrão idempotente de `backfillSearchKeywords` (batch, só grava se mudou, 2ª execução é no-op). Por produto:
1. Deriva o **conjunto de atributos** = chaves preenchidas (valor não vazio) presentes em **todas** as variações; remove chaves vazias.
2. Para cada atributo, deriva `values` = valores distintos usados, em ordem de primeira aparição.
3. Se as variações **discordam** (uma variação tem chave que outra não tem, ou valor vazio onde outra tem valor) → marca `variationsInconsistent = true` com o motivo, **sem** alterar as variações nem inventar valor.
4. Produto sem variação → `attributes: []`, consistente.
Recalcula o mesmo flag derivado do save, então rodar de novo não muda nada.

**Racional**: atende FR-014/FR-015 (idempotência + sinalização, nunca adivinhar). Reusa o gerador de flag do `productService` para não divergir do runtime.

**Alternativas**: heurística que "conserta" inconsistências (ex.: preencher tamanho vazio com "único") — rejeitada explicitamente pelo usuário (não adivinhar).

## R-6 — Remoção/fusão de combinações com resolução explícita (FR-008a)

**Decisão**: ao remover um atributo (ou um valor) que faça **duas ou mais variações colapsarem na mesma combinação**, o editor detecta o conflito **antes de salvar** e abre um passo de resolução: para cada grupo em conflito, o lojista escolhe **qual variação sobrevive** (o `id` sobrevivente) **ou** "somar estoques" (mantém um id, soma os `stock`). Só depois de resolvido o salvar prossegue. Remover um valor que ainda tem variação/estoque associado sem colapso também é bloqueado até o lojista remover/realocar essas variações. Nunca automático/silencioso.

**Racional**: FR-008a e a orientação explícita do usuário — não perder estoque nem escolher sozinho. Preserva R-2 (o id sobrevivente é reusado; carrinho/pedido do sobrevivente seguem válidos).

**Alternativas**: somar automaticamente / manter a primeira — rejeitadas (perda silenciosa / escolha arbitrária).

## R-7 — Algoritmo do seletor por atributo (vitrine)

**Decisão**: hook `useVariationSelection(product)` que expõe, para os `product.attributes` (ordenados) e as variações:
- `selected: { [attrName]: value | null }` (ordem de escolha livre);
- para cada atributo e cada valor: `available` = existe variação com `stock > 0` que casa com a seleção atual **dos demais** atributos ∪ `{attr: value}`; valores sem match ficam desabilitados/riscados;
- `resolvedVariation` = a variação única quando **todos** os atributos estão selecionados; senão `null`;
- `currentStock`/`canBuy` derivam de `resolvedVariation` (nunca de seleção parcial).
Funciona para 1, 2 e 3+ atributos (a disponibilidade é genérica sobre N eixos). Produto simples (`attributes: []`) → sem seletor, `canBuy` pelo `stock` geral. Componente `VariationSelector` só apresenta (uma linha por atributo, na ordem declarada de valores — FR-002a).

**Racional**: separar lógica (hook, testável com 1/2/3+ atributos e casos esgotados) da apresentação (Princípio I). Substitui o `VariationSelector` atual, que itera variações 1:1.

**Alternativas**: manter botão por combinação — é justamente o que a feature remove.

## R-8 — Editor de atributos/valores no admin (UX)

**Decisão**: subcomponente `AttributeEditor` acima da tabela de variações: adicionar/renomear/remover atributo e, por atributo, adicionar/reordenar/remover valores (setas ou drag simples). A tabela de variações passa a ter **uma coluna (select do valor permitido) por atributo declarado**; "adicionar variação" cria linha com selects vazios; salvar valida via `variationValidation` (vazio/duplicado/conjunto). Preço/SKU/estoque por variação preservados. Mudanças que disparam conflito (R-6) abrem o passo de resolução.

**Racional**: substitui os campos fixos Tamanho/Cor por um editor dinâmico coerente com R-1; mantém o restante do formulário e do fluxo de save atuais.

**Alternativas**: manter grade livre de texto — rejeitada (reintroduz typo/inconsistência que a feature combate).

## Resumo de impacto
- **Sem** novas coleções, **sem** mudança de rules; **+** índices compostos para excluir `variationsInconsistent` das consultas públicas (R-4).
- Pedidos/carrinho existentes intactos por R-2 (ids estáveis) + congelamento já existente do item de pedido.
- Migração idempotente e conservadora (R-5); nada é "adivinhado".
