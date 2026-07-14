# Implementation Plan: Variações por Atributo

**Branch**: `008-variacoes-por-atributo` | **Date**: 2026-07-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-variacoes-por-atributo/spec.md`

## Summary

Trocar o modelo e o seletor de variações. O produto passa a declarar uma lista **ordenada de atributos**, cada um com **nome + lista ordenada de valores permitidos**; toda variação escolhe um valor por atributo (conjunto idêntico, sem vazio, combinação única). O admin ganha um editor de variações **dinâmico** (define atributos/valores, uma coluna por atributo) com validação que bloqueia salvar/publicar inconsistências. A vitrine troca o seletor **por combinação** por um seletor **por atributo** (1/2/3+ atributos, valores indisponíveis desabilitados, compra só com tudo escolhido). Uma migração idempotente deriva atributos/valores dos dados legados e **sinaliza** (não adivinha) os inconsistentes; produto sinalizado fica **escondido da vitrine** e **alertado no admin** (listagem + dashboard + edição).

Duas invariantes técnicas críticas, ambas já parcialmente garantidas pelo código atual e que o plano **preserva explicitamente**:

- **IDs de variação estáveis**: a identidade de uma variação é seu `id`, não a combinação de valores. Editar atributos/valores (adicionar Material, reordenar, renomear) **reusa o `id`** enquanto a combinação persistir — só combinação nova gera `id` novo, e a fusão de combinações (FR-008a) escolhe qual `id` sobrevive. Isso mantém o carrinho salvo (M2, `lineId = productId::variationId`) e os pedidos apontando para ids válidos.
- **Compra transacional revalida**: `createOrder` (M1/003) já lê o produto **dentro** da `runTransaction`, resolve a variação por `variationId` e aborta com erro claro se ela sumiu ou está sem estoque. A feature não altera essa atomicidade; ids estáveis + essa revalidação cobrem a concorrência lojista-edita × cliente-compra.

## Technical Context

**Language/Version**: JavaScript (ES Modules), React 19.2 + Vite 8 — sem TypeScript.

**Primary Dependencies**: Firebase SDK 12 (Firestore), React Router 7, MUI 9 (pontual no admin), CSS Modules + tokens de `variables.css`.

**Storage**: Firestore (coleção `products`; variações embutidas em `products.variations[]`; sem novas coleções).

**Testing**: Vitest 4 + React Testing Library + jsdom; Firestore mockado nos testes de serviço (padrão das features 003/005/007).

**Target Platform**: Web (loja pública + painel admin), responsivo.

**Project Type**: Web app single-frontend (sem backend); admin code-split (`React.lazy`).

**Performance Goals**: página de produto interativa < 3s (Princípio IV); lógica do seletor memoizada; migração é rotina dev pontual (não caminho do cliente).

**Constraints**: mudança **aditiva e retrocompatível** no doc do produto; nenhuma nova escrita pública (admin escreve, vitrine lê); não quebrar Home, catálogo, carrinho persistente, pedidos, painel nem a área de conta (007).

**Scale/Scope**: catálogo pequeno-médio; tipicamente 1–3 atributos por produto; poucos produtos legados inconsistentes (transitório até o lojista corrigir).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Maintainability** — PASS. Lógica do seletor por atributo isolada em hook (`useVariationSelection`) separado do componente de apresentação; validação de variações centralizada num util reutilizado por form, backfill e service (sem duplicar regra). Nomenclatura de domínio (`Product`, `Variation`, `attributes`). `oxlint` zero erros.
- **II. Testing Standards** — PASS (NON-NEGOTIABLE aqui). Toca estoque/compra → exige testes: validação de consistência (vazio/duplicado/conjunto divergente), algoritmo de disponibilidade do seletor (1/2/3+ atributos), `createOrder` abortando quando a variação some/muda de estoque, migração idempotente + sinalização, e a resolução de conflito na remoção (FR-008a).
- **III. User Experience Consistency** — PASS. Seletor e editor usam tokens do design system; estados de vazio/erro/indisponível explícitos; `docs/design-system.md` atualizado no mesmo escopo (seção do seletor por atributo). Alertas do admin reusam o padrão "Cadastro incompleto" já existente (badge na listagem + card de Alertas no dashboard).
- **IV. Performance Requirements** — PASS com atenção. Derivação de valores/disponibilidade memoizada; esconder produto inconsistente da vitrine acrescenta filtro de igualdade nas consultas públicas → índices compostos adicionais **escopados** (documentado em research R-4). Sem leitura ilimitada nova; admin segue code-split.

Sem violações a justificar → seção Complexity Tracking vazia.

## Project Structure

### Documentation (this feature)

```text
specs/008-variacoes-por-atributo/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — decisões (modelo, ids, concorrência, hide+alerta, migração, seletor)
├── data-model.md        # Fase 1 — Produto (attributes[] + flag), Variação, invariantes de id/carrinho/pedido
├── contracts/
│   ├── services.md      # productService (validação/consistência), migração, orderService (revalidação)
│   └── ui.md            # Editor de variações (admin) e VariationSelector (vitrine): contratos de comportamento
├── quickstart.md        # Fase 1 — roteiro de validação ponta a ponta
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
frontend/src/
├── constants/product.js                # + limites/util de atributos (nomes/valores)
├── utils/
│   ├── variationValidation.js          # NOVO — validação de consistência (vazio/duplicado/conjunto), reuso form+backfill+service
│   └── __tests__/variationValidation.test.js
├── services/
│   ├── productService.js               # withDerivedFields: + flag variationsInconsistent; validateProduct: bloqueio publicar; consultas públicas excluem sinalizados
│   ├── orderService.js                 # SEM mudança de atomicidade; confirmar/testar aborto quando variationId sumiu (já existe)
│   └── __tests__/…                      # consistência + concorrência
├── hooks/
│   ├── useVariationSelection.js        # NOVO — seleção por atributo + disponibilidade (vitrine)
│   └── __tests__/useVariationSelection.test.jsx
├── components/VariationSelector/index.jsx   # REESCRITO — por atributo (1/2/3+), valores indisponíveis desabilitados
├── pages/
│   ├── Product/index.jsx               # usa o novo seletor; compra só com tudo selecionado
│   └── Admin/
│       ├── Products/Form/index.jsx     # editor dinâmico + resolução de conflito na remoção (FR-008a)
│       ├── Products/Form/AttributeEditor/…  # NOVO — subcomponente de atributos/valores
│       ├── Products/List/index.jsx     # badge "Variação inconsistente" na linha
│       └── Dashboard/index.jsx         # card de Alertas: "N produtos ocultos por inconsistência"
├── dev/backfillVariations.js           # NOVO — migração idempotente + sinalização
(raiz) firestore.indexes.json           # + índices p/ excluir variationsInconsistent das consultas públicas (arquivo na RAIZ do repo, não em frontend/)
```

**Structure Decision**: single-frontend existente. Toda a mudança fica em `frontend/src` (mais 1 entrada em `firestore.indexes.json` e a doc `docs/design-system.md`). Sem backend, sem novas coleções, sem mudança nas security rules (a vitrine continua lendo `products` com `status ativo && !deleted`; a exclusão de inconsistentes é filtro adicional de igualdade). Variações seguem embutidas no produto.

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
