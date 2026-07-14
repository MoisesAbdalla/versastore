# Quickstart — Variações por Atributo (008)

Roteiro de validação ponta a ponta. Rodar `npm run dev`, `npm run test`, `npm run lint`, `npm run build` em `frontend/`. Referências de comportamento: [contracts/services.md](contracts/services.md), [contracts/ui.md](contracts/ui.md), [data-model.md](data-model.md).

## Pré-requisitos
- Logado como **admin** para o painel; base com pelo menos: um produto 2-atributos consistente, um produto simples, e um produto legado inconsistente (ex.: uma variação "azul" sem tamanho).
- Rodar a migração uma vez (dev, console): `await backfillVariations()`.

## 1. Admin — editor dinâmico + validação (US1)
1. Novo produto → em Atributos, adicionar "Tamanho" [P, M, G, GG] e "Cor" [preta, azul]. A tabela de variações passa a ter colunas Tamanho e Cor (selects).
2. Adicionar variação com Cor preenchida e Tamanho vazio → salvar **bloqueia** apontando o campo.
3. Duplicar a combinação "P/preta" → salvar **bloqueia** por duplicidade.
4. Completar combinações válidas com estoque → salva; publicar (ativo) → permitido.
5. Reordenar valores de Tamanho para [GG, G, M, P] → salvar; conferir que a vitrine passa a exibir nessa ordem.

## 2. Admin — mutabilidade e conflito de remoção (FR-020/FR-008a)
1. No produto publicado com Tamanho/Cor, adicionar atributo "Material" → o editor exige Material em todas as variações; salvar/publicar **bloqueado** até preencher.
2. Num produto com "P/preta" e "P/azul" (estoques diferentes), remover o atributo "Cor" → abre o passo de **resolução** (escolher qual sobrevive ou somar estoques); só salva após resolver. Conferir que o estoque não some sozinho e o `id` sobrevivente é mantido.

## 3. Vitrine — seletor por atributo (US2)
1. Produto 2-atributos: selecionar "P" → cores sem combinação/estoque para "P" ficam desabilitadas/riscadas.
2. Sem tudo selecionado → botão não permite comprar e há orientação. Completar → estoque/preço da variação e botão habilitam.
3. Combinação esgotada → botão "Esgotado".
4. Produto **1 atributo** (ex.: Voltagem 110V/220V) → resolve na primeira escolha.
5. Produto **3 atributos** → escolher em qualquer ordem, compra só com os três.
6. Produto **simples** (sem atributos) → sem seletor, compra direta (nenhuma regressão).

## 4. Migração + inconsistente escondido/alertado (US3/FR-017)
1. `await backfillVariations()`: produto consistente recebe `attributes`; produto simples fica `attributes: []`; produto inconsistente é **sinalizado** (variações intactas). Rodar de novo → nenhuma mudança (idempotente).
2. Vitrine: o produto inconsistente **não aparece** no catálogo nem na página (404 amigável).
3. Admin: badge "Variação inconsistente" na listagem; contador no card de Alertas do dashboard; banner na edição explicando o que corrigir.
4. Corrigir as variações no admin (satisfazer a validação) → produto some dos alertas e **reaparece** na vitrine (se ativo).

## 5. Integridade de carrinho e pedidos (FR-018/FR-019 — regressão)
1. Cliente adiciona uma variação ao carrinho; admin **reordena/renomeia atributo/adiciona Material** (sem remover aquela combinação) → ao reabrir o carrinho, o item **permanece** (id estável), revalidação não descarta.
2. Concorrência: com o item no carrinho, admin **remove** exatamente aquela variação → a compra (`createOrder`) aborta com erro claro, **sem** baixar estoque de outra variação; a UI orienta revalidar.
3. Pedido histórico (feito antes da mudança) → detalhe continua mostrando o rótulo da variação comprada, inalterado.

## Gates
- `npm run test` verde (novos: variationValidation, useVariationSelection, productService consistência/hide, orderService concorrência, backfillVariations); `npm run lint` sem erros; `npm run build` íntegro.
- Deploy dos índices (`firestore.indexes.json`) é passo manual do lojista antes de a vitrine excluir inconsistentes em produção.
