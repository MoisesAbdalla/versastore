# Tasks: Variações por Atributo

**Input**: Design documents from `/specs/008-variacoes-por-atributo/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.md, contracts/ui.md, quickstart.md, research.md

**Tests**: INCLUÍDOS — a feature toca estoque/compra (Princípio II, NON-NEGOTIABLE): consistência de variações, algoritmo do seletor, concorrência da compra, migração idempotente e resolução de fusão.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US3 — mapeia para as user stories da spec.md
- Caminhos exatos incluídos em cada tarefa

---

## Phase 1: Setup

- [ ] T001 [P] Adicionar em `frontend/src/constants/product.js` os helpers/labels de atributos de variação (rótulos pt-BR de erro de consistência e eventuais limites), sem lógica de validação (que fica no util da Fase 2)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: bloqueia todas as user stories (modelo + regra única de consistência)

- [ ] T002 [P] Criar `frontend/src/utils/variationValidation.js`: `validateVariations(product)` (chave faltando/valor vazio, conjunto divergente, combinação duplicada, valor fora da lista permitida; produto simples → ok), `deriveAttributesFromVariations(variations)` (conjunto = chaves não vazias em TODAS as variações; `values` por atributo em ordem de primeira aparição; `inconsistent`+motivo se discordam; NÃO inventa valores) e `detectMergeConflicts(prevVariations, nextAttributes)` (grupos que colapsam na mesma combinação) — testes em `frontend/src/utils/__tests__/variationValidation.test.js` (vazio, faltando chave, conjunto divergente, duplicado, valor fora da lista, produto simples, deriveAttributes idempotente, conflitos de remoção)
- [ ] T003 Estender `frontend/src/services/productService.js` `withDerivedFields`: gravar `attributes` como recebido e computar os campos derivados `variationsInconsistent` + `variationIssues` via `validateVariations` (mesmo ponto do `incomplete`/`incompleteFields`) — testes em `frontend/src/services/__tests__/productService.test.js` (flag setado/limpo conforme validade; produto simples fica consistente)

**Checkpoint**: modelo `attributes[]` e a regra única de consistência prontos e testados

---

## Phase 3: User Story 1 - Lojista cadastra variações consistentes por atributo (Priority: P1) 🎯 MVP

**Goal**: editor de variações dinâmico (atributos + valores ordenados) com validação que bloqueia salvar/publicar inconsistências e trata a fusão de combinações; ids de variação preservados.

**Independent Test**: quickstart §1 e §2 — cadastrar produto Tamanho/Cor, ser bloqueado por atributo vazio e por combinação duplicada, publicar só quando consistente, reordenar valores, e resolver o conflito ao remover um atributo.

- [ ] T004 [US1] Estender `frontend/src/services/productService.js` `validateProduct`: quando `status === ativo` e `validateVariations` falhar, lançar `serviceError("variacoes-inconsistentes", <o que corrigir>)` (bloqueia publicar — FR-007); garantir que `create/updateProduct` **persistem as variações com os ids fornecidos** (não regenerar id — R-2) — testes em `frontend/src/services/__tests__/productService.test.js` (publicar inconsistente bloqueia; id preservado no update)
- [ ] T005 [P] [US1] Criar `frontend/src/pages/Admin/Products/Form/AttributeEditor/index.jsx` (+ `styles.module.css`): adicionar/renomear/remover atributo e, por atributo, adicionar/**reordenar**/remover valores (setas), nos tokens do design system
- [ ] T006 [US1] Reescrever a seção de variações em `frontend/src/pages/Admin/Products/Form/index.jsx`: usar `AttributeEditor`; tabela de variações com **uma coluna (select do valor permitido) por atributo declarado**; "adicionar variação" cria linha com selects vazios; `formToProduct` grava `product.attributes` e **reusa o id** da variação existente (id novo só para linha nova); validação campo a campo no `handleSave` via `variationValidation` (bloqueia salvar; mensagem clara ao publicar)
- [ ] T007 [US1] Implementar o passo de **resolução de conflito de fusão** (FR-008a) no `Form`: ao remover atributo/valor, rodar `detectMergeConflicts`; se houver colapso, abrir `ConfirmDialog`/passo inline onde o lojista escolhe, por grupo, **qual variação sobrevive** (id) ou **somar estoques**; só então prosseguir o save — nunca automático
- [ ] T008 [US1] Teste de integração do editor em `frontend/src/pages/Admin/Products/Form/__tests__/variation-editor.test.jsx`: atributo vazio bloqueia; combinação duplicada bloqueia; publicar inconsistente bloqueia; remoção com colapso abre resolução e respeita a escolha (id sobrevivente/soma); reordenar valores reflete na ordem gravada

**Checkpoint**: admin cadastra/edita variações consistentes; publicar inconsistente é impossível; ids estáveis

---

## Phase 4: User Story 2 - Cliente escolhe a variação por atributo (Priority: P1)

**Goal**: seletor por atributo na vitrine (1/2/3+), valores indisponíveis desabilitados, compra só com tudo selecionado; produto simples sem seletor; integridade de compra/carrinho preservada.

**Independent Test**: quickstart §3 e §5 — escolher valores em qualquer ordem, ver indisponíveis riscados, comprar só completo; produto de 1 e de 3 atributos; produto simples; e as regressões de carrinho/concorrência.

- [ ] T009 [P] [US2] Criar `frontend/src/hooks/useVariationSelection.js`: `selected`/`select` (ordem livre), `optionsByAttribute` (valor+`available` conforme seleção dos demais atributos, ordem declarada), `resolvedVariation` (única com todos selecionados), `currentStock`/`canBuy` (do resolvido; produto simples usa `stock`) — testes em `frontend/src/hooks/__tests__/useVariationSelection.test.jsx` (1 atributo resolve imediato; 2 filtram cruzado; 3 em qualquer ordem; combinação esgotada indisponível; produto simples compra direta)
- [ ] T010 [US2] Reescrever `frontend/src/components/VariationSelector/index.jsx` (+ ajustar `styles.module.css`): uma linha por atributo (rótulo = nome), chips na **ordem declarada**, valor indisponível `disabled`+riscado, escolhido com `aria-pressed`; sem lógica de disponibilidade no componente (vem do hook) — suporta 1/2/3+ atributos
- [ ] T011 [US2] Ajustar `frontend/src/pages/Product/index.jsx`: consumir `useVariationSelection`; mostrar estoque/preço só com `resolvedVariation`; botão desabilitado até `canBuy`; seleção incompleta orienta "selecione as opções"; produto sem atributos → sem seletor (fluxo simples atual)
- [ ] T012 [US2] Teste de concorrência em `frontend/src/services/__tests__/orderService.test.js` (SEM alterar atomicidade — R-3): comprar `variationId` removido no meio → `createOrder` aborta `nao-encontrado` **sem** baixar estoque de outra variação; e variação mantida após edição cosmética → compra conclui
- [ ] T013 [P] [US2] Teste de integridade do carrinho em `frontend/src/contexts/__tests__/CartContext.test.jsx`: item com `variationId` estável **permanece** após edição que preserva a combinação; variação removida → revalidação descarta com sinalização (FR-019)

**Checkpoint**: cliente compra por atributo em qualquer nº de eixos; carrinho/pedido não perdem itens válidos

---

## Phase 5: User Story 3 - Migração, esconder inconsistente e alertar no admin (Priority: P2)

**Goal**: produto inconsistente some da vitrine e fica alertado no admin em 3 pontos; migração idempotente sinaliza sem adivinhar.

**Independent Test**: quickstart §4 — rodar o backfill (consistente recebe atributos, simples fica vazio, inconsistente sinalizado, 2ª execução no-op); produto inconsistente some da vitrine; badge/alerta/banner no admin; corrigir → reaparece.

- [ ] T014 [US3] Estender as leituras públicas em `frontend/src/services/productService.js`: `listPublicProducts` e `getFeaturedProducts` adicionam `where("variationsInconsistent","==",false)`; `getPublicProduct` retorna `null` também quando `variationsInconsistent` — testes em `frontend/src/services/__tests__/productService.test.js` (inconsistente não aparece na listagem; `getPublicProduct` esconde). ⚠️ **T020 (deploy dos índices) é pré-requisito DURO de este código ir para produção**: sem os índices, o filtro novo quebra TODA a listagem pública/Home/busca, não só a ocultação.
- [ ] T015 [US3] Atualizar `firestore.indexes.json` (**raiz do repositório**, não em frontend/): adicionar os índices compostos das consultas públicas com o campo de igualdade `variationsInconsistent` (combinações de `deleted`+`status`[+`categoryId`][+`searchKeywords`]+`orderBy` — data-model.md)
- [ ] T016 [P] [US3] Criar `frontend/src/dev/backfillVariations.js` (padrão idempotente de `backfillSearchKeywords`): por produto, `deriveAttributesFromVariations` → grava `attributes` + `variationsInconsistent`/`variationIssues` **só se mudou**; nunca altera variações de inconsistentes (só sinaliza); loga e retorna `{ updated, flagged, skipped }`; registrar em `frontend/src/main.jsx` (bloco DEV) — testes em `frontend/src/dev/__tests__/backfillVariations.test.js` (consistente recebe atributos; inconsistente sinalizado sem alterar variações; simples fica `[]`; 2ª execução `updated:0`)
- [ ] T017 [P] [US3] Adicionar em `frontend/src/pages/Admin/Products/List/index.jsx` o badge "Variação inconsistente" na linha do produto sinalizado
- [ ] T018 [P] [US3] Adicionar no card de Alertas do `frontend/src/pages/Admin/Dashboard/index.jsx` o contador/lista "N produtos ocultos por inconsistência de variação" (reusa o padrão `alerts.incompleteProducts`)
- [ ] T019 [US3] Adicionar em `frontend/src/pages/Admin/Products/Form/index.jsx` o banner na edição do produto sinalizado explicando `variationIssues` e como corrigir
- [ ] T020 [US3] **[DEPLOY MANUAL DO USUÁRIO — não é código]** Após T015 mergeado: rodar `firebase deploy --only firestore:indexes` e aguardar a construção dos índices, **antes** de a vitrine excluir inconsistentes em produção (quickstart § Passos manuais)
- [ ] T021 [US3] **[MIGRAÇÃO MANUAL DO USUÁRIO — não é código]** Depois de US1 (editor) + T014/T016 prontos: rodar `await backfillVariations()` (dev, admin, console) e conferir `{ updated, flagged, skipped }`; corrigir no admin os `flagged`; rodar de novo e confirmar `updated: 0` (idempotente) — quickstart §4 e § Passos manuais

**Checkpoint**: catálogo coerente pós-migração; nada é adivinhado; inconsistentes invisíveis ao cliente e gritantes no admin

---

## Phase 6: Polish & Cross-Cutting

- [ ] T022 [P] Atualizar `docs/design-system.md`: seção da página de produto — seletor **por atributo** (uma linha por atributo, valores na ordem declarada, indisponível riscado) substituindo "chips por variação"; e registrar o badge/alerta de "variação inconsistente" no admin
- [ ] T023 Gates finais: `npm run lint` (zero erros), `npm run test` (suíte atual + novos verdes), `npm run build` (bundle íntegro; admin segue code-split)
- [ ] T024 Regressão do quickstart.md (§1–5): Home, catálogo, carrinho persistente, pedidos, painel admin e área de conta (007) intactos — **validação manual do usuário**

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (T001)** → **Foundational (T002, T003)** bloqueiam tudo.
- **US1 (Phase 3)**: depende de T002/T003; T004 (service) ∥ T005 (AttributeEditor); T006 depois de T004/T005; T007 depois de T006; T008 por último.
- **US2 (Phase 4)**: depende de T002/T003 (modelo). T009 ∥ T005; T010 depois de T009; T011 depois de T010; T012/T013 (regressão) podem correr em paralelo após o modelo.
- **US3 (Phase 5)**: depende de T003 (flag) e, para T021, de US1 (editor) pronto. T014 depois de T003; T015 acompanha T014; T016 ∥ T017 ∥ T018; T019 no Form. **T020 (deploy índices)** depende de T015. **T021 (rodar backfill)** depende de T016 + US1 + T014.
- **Polish (Phase 6)**: depois das stories.

### Ordem recomendada (MVP-first)
Setup → Foundational → **US1** (editor consistente, P1) → **US2** (seletor por atributo, P1) → US3 (migração/esconder/alertar) → **[T020 deploy índices]** → **[T021 rodar backfill + corrigir sinalizados]** → Polish.

### Parallel Opportunities
- Foundational: T002 ∥ (T003 depende de T002).
- US1: T004 ∥ T005. US2: T009 ∥ T005; T013 ∥ T012. US3: T016 ∥ T017 ∥ T018.

## Implementation Strategy

### MVP (US1 + US2)
1. Fases 1–2 (util de consistência + flag derivado no service).
2. US1 → validar quickstart §1/§2 (editor dinâmico, bloqueios, conflito de fusão, ids estáveis).
3. US2 → validar quickstart §3/§5 (seletor por atributo 1/2/3+, produto simples, concorrência/carrinho).

### Incremental Delivery
US1 → US2 → US3. Só após US1+US3(código) o usuário roda os **passos manuais**: **T020** (`firebase deploy --only firestore:indexes`) e **T021** (`await backfillVariations()`), conferindo `{updated, flagged, skipped}` e corrigindo os sinalizados. Parar em cada checkpoint para validação.

## Notes
- Nenhuma coleção nova; nenhuma mudança nas security rules; variações seguem embutidas no produto.
- Invariantes preservadas: **id de variação estável** (carrinho/pedido intactos — R-2) e **atomicidade da compra** (createOrder relê e aborta — R-3).
- Passos manuais do usuário (não código): **T020** deploy dos índices e **T021** execução da migração `backfillVariations` (com verificação de `{updated, flagged, skipped}` e idempotência).
