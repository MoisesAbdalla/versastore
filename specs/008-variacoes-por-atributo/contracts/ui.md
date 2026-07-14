# Contracts — UI (008)

## Vitrine: `hooks/useVariationSelection.js` (NOVO) + `components/VariationSelector` (REESCRITO)

**`useVariationSelection(product)`** expõe:
- `attributes`: `product.attributes` (ordenados) — vazio para produto simples;
- `selected`: `{ [attrName]: value | null }`; `select(attrName, value)` (ordem livre, alternar);
- `optionsByAttribute`: por atributo, os valores na **ordem declarada**, cada um com `{ value, available }` — `available` = existe variação com `stock>0` casando com a seleção atual dos **demais** atributos ∪ `{attr:value}`;
- `resolvedVariation`: variação única quando todos os atributos selecionados; senão `null`;
- `currentStock`, `canBuy`: derivados de `resolvedVariation` (nunca de seleção parcial); produto simples → `stock` geral.

**`VariationSelector`** (apresentação): uma linha por atributo (rótulo = nome do atributo), valores como chips na ordem declarada; valor indisponível `disabled` + riscado; valor escolhido destacado (`aria-pressed`). 1/2/3+ atributos suportados. Nenhuma lógica de disponibilidade no componente.

**`pages/Product`**: usa o hook; mostra estoque/preço só com `resolvedVariation`; botão "Adicionar ao carrinho" desabilitado até `canBuy`; com seleção incompleta, orienta "selecione as opções". Produto sem atributos → sem seletor (fluxo simples atual).

Testes (hook): 1 atributo resolve imediato; 2 atributos filtram cruzado; 3 atributos em qualquer ordem; combinação esgotada → valor indisponível e sem compra; produto simples → compra direta.

## Admin: editor dinâmico `Products/Form` + `AttributeEditor` (NOVO)

**`AttributeEditor`** (acima da tabela de variações):
- adicionar/renomear/remover atributo; por atributo, adicionar/**reordenar**/remover valores (setas ou drag simples);
- a tabela de variações reflete **uma coluna (select do valor permitido) por atributo**; "adicionar variação" cria linha com selects vazios;
- estoque/SKU/preço por variação preservados.

**Validação/save**: usa `variationValidation` → erros campo a campo (vazio/duplicado/conjunto); salvar bloqueado enquanto inválido; publicar (status ativo) bloqueado com mensagem clara (FR-006/FR-007). **Ids reusados** ao editar (R-2).

**Conflito de remoção (FR-008a/R-6)**: ao remover atributo/valor que colapse variações, `detectMergeConflicts` dispara um passo (modal/inline `ConfirmDialog`) onde o lojista, por grupo, escolhe **qual variação sobrevive** ou **somar estoques**; só então salva. Nunca automático.

**Alerta impossível de ignorar (FR-017a)**:
- `Products/List`: badge "Variação inconsistente" na linha do produto sinalizado.
- `Dashboard` (card Alertas): item/contador "N produtos ocultos por inconsistência de variação" (reusa o padrão `alerts.incompleteProducts`).
- `Products/Form`: banner na edição do produto sinalizado explicando o problema (`variationIssues`) e como corrigir.

Testes (componente/integração): salvar com atributo vazio bloqueia; combinação duplicada bloqueia; publicar inconsistente bloqueia; remoção com colapso abre resolução e respeita a escolha; badge/alerta aparecem para produto sinalizado.

## Design system

`docs/design-system.md`: atualizar a seção da página de produto — seletor **por atributo** (uma linha por atributo, valores na ordem declarada, indisponível riscado) substitui o "chips por variação"; e registrar o badge/alerta de "variação inconsistente" no admin.
