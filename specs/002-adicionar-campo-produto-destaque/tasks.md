---

description: "Task list for Produto em Destaque (Admin + Home)"
---

# Tasks: Produto em Destaque (Admin + Home)

**Input**: Design documents from `/specs/002-adicionar-campo-produto-destaque/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/product-service.md](./contracts/product-service.md), [quickstart.md](./quickstart.md)

**Tests**: Não solicitados de forma geral no spec, mas a Constituição (II) exige teste automatizado
para qualquer lógica que altere estoque — esta feature altera estoque na edição de produto (US3),
então T013 é obrigatória (não-negociável), não opcional. Esta é também a primeira feature do projeto
a introduzir um test runner (T002).

**Organization**: Tasks agrupadas por user story (US1/US2/US3, conforme prioridade P1/P2/P3 do
spec.md) para permitir implementação e teste independentes de cada uma.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tasks incompletas)
- **[Story]**: A qual user story a task pertence (US1, US2, US3)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único de frontend — todos os caminhos são relativos à raiz do repo, dentro de `frontend/`.

---

## Phase 1: Setup

**Purpose**: Confirmar baseline e preparar a infraestrutura de teste exigida pela Constituição para
esta feature

- [X] T001 Rodar `cd frontend && npm run lint` e confirmar baseline limpa antes de qualquer mudança
- [X] T002 Adicionar Vitest + React Testing Library ao projeto: `vitest`, `@testing-library/react`,
      `@testing-library/jest-dom`, `jsdom` como devDependencies em `frontend/package.json`;
      configurar bloco `test` (ambiente `jsdom`) em `frontend/vite.config.js`; adicionar script
      `"test": "vitest run"` em `frontend/package.json` (research.md §6)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura compartilhada que bloqueia todas as user stories

Nenhuma dependência bloqueante compartilhada entre as três user stories nesta feature — US1, US2 e
US3 tocam arquivos distintos (formulário de cadastro / Home / telas novas do Admin) e podem começar
em paralelo assim que a Phase 1 (Setup) terminar. Fase mantida vazia de propósito.

**Checkpoint**: Setup pronto — as user stories podem começar

---

## Phase 3: User Story 1 - Marcar produto como destaque ao cadastrar (Priority: P1) 🎯 MVP

**Goal**: Checkbox "Marcar como produto em destaque" no formulário de cadastro já existente,
gravando `destaque: true/false` no Firestore.

**Independent Test**: Preencher o cadastro em `/admin`, marcar/desmarcar o checkbox, salvar, e
conferir `destaque` no documento criado no Firestore — sem depender da Home ou de telas de edição
(spec.md).

### Implementation for User Story 1

- [X] T003 [US1] Adicionar estado `destaque` (boolean, default `false`) e o checkbox MUI "Marcar
      como produto em destaque" ao formulário de cadastro; incluir `destaque` no objeto passado para
      `createProduct`; resetar o checkbox para `false` junto com os demais campos após salvar com
      sucesso (FR-001, FR-002, acceptance scenario 3) — `frontend/src/pages/Admin/index.jsx`
- [X] T004 [US1] QA manual conforme quickstart.md §1: cadastrar um produto com o checkbox marcado e
      outro sem marcar, conferir `destaque: true`/`destaque: false` nos documentos criados no
      Firestore — depende de T003

**Checkpoint**: US1 completa e testável de forma independente

---

## Phase 4: User Story 2 - Home exibe produtos em destaque reais, embaralhados (Priority: P2)

**Goal**: A seção "Produtos em Destaque" da Home busca produtos reais do Firestore (`destaque ==
true`), em ordem embaralhada a cada carregamento, com estado vazio quando não há nenhum.

**Independent Test**: Marcar produtos como destaque diretamente no Firestore (ou via US1), carregar
a Home e conferir que exibe exatamente esses produtos, em ordens variando entre recarregamentos, e
mostra "Em breve" quando não há nenhum (spec.md).

### Implementation for User Story 2

- [X] T005 [P] [US2] Adicionar `getFeaturedProducts()` em `frontend/src/services/productService.js`
      — `query(collection(db,"products"), where("destaque","==",true))` + `getDocs`, retornando os
      produtos com `id` (contracts/product-service.md, research.md §1)
- [X] T006 [P] [US2] Ajustar `ProductCard` para o formato real do produto: usar `product.name` (não
      `product.title`), omitir o preço "de" riscado quando `oldPrice` estiver ausente, omitir o
      bloco de avaliação (estrela + nota) quando `rating` estiver ausente — sem acessar
      `.toFixed()`/propriedades de campos ausentes (research.md §4, data-model.md) —
      `frontend/src/components/ProductCard/index.jsx`
- [X] T007 [US2] Reescrever `FeaturedProducts` para buscar via `getFeaturedProducts()` no `useEffect`
      de montagem, embaralhar o resultado uma vez por fetch (Fisher-Yates, research.md §2), tratar
      falha na busca caindo no mesmo estado vazio, e exibir a mensagem "Em breve" no lugar do
      carrossel quando a lista vier vazia (FR-004, FR-005, FR-006) — depende de T005, T006 —
      `frontend/src/components/FeaturedProducts/index.jsx`,
      `frontend/src/components/FeaturedProducts/styles.module.css`
- [X] T008 [US2] QA manual conforme quickstart.md §2: destacar 3+ produtos reais e confirmar exibição
      exclusiva/embaralhamento entre recarregamentos/estado vazio quando nenhum produto está em
      destaque — depende de T007

**Checkpoint**: US1 + US2 completas e testáveis de forma independente

---

## Phase 5: User Story 3 - Editar um produto já cadastrado, incluindo o destaque (Priority: P3)

**Goal**: Listagem de produtos no Admin + tela de edição com todos os campos (incluindo destaque),
imagem opcional na edição.

**Independent Test**: Abrir a listagem no Admin, selecionar um produto, editar campos (incluindo
destaque), salvar, e conferir que o Firestore reflete exatamente as mudanças sem afetar campos não
alterados (spec.md).

### Implementation for User Story 3

- [X] T009 [US3] Adicionar `getProducts()`, `getProduct(id)` e `updateProduct(id, changes)` em
      `frontend/src/services/productService.js`, conforme contracts/product-service.md (`updateDoc`
      para merge parcial — campos ausentes em `changes` permanecem intocados)
- [X] T010 [US3] Criar a tela de listagem em `frontend/src/pages/Admin/ProductList/index.jsx`
      (tabela MUI buscando via `getProducts()`, exibindo nome + indicador de destaque de cada
      produto, cada linha navegando para a edição do produto correspondente) — FR-003, research.md
      §7 — depende de T009
- [X] T011 [US3] Adicionar as rotas `/admin/products` (listagem) e `/admin/products/:id` (edição) em
      `frontend/src/routes/index.jsx`, e um link de acesso a partir de
      `frontend/src/pages/Admin/index.jsx` — depende de T010
- [X] T012 [US3] Criar a tela de edição em `frontend/src/pages/Admin/ProductEdit/index.jsx`:
      carregar o produto via `getProduct(id)` e pré-preencher todos os campos (nome, categoria,
      preço, estoque, descrição, imagem, destaque — FR-003a); permitir alterar qualquer campo,
      incluindo ativar/desativar o destaque (FR-003b); tratar a seleção de nova imagem como opcional
      — exibir a imagem já salva (`existingImageUrl`) quando nenhum arquivo novo for escolhido, e só
      fazer upload via `uploadImage` (Cloudinary) quando um arquivo novo (`newImageFile`) for
      selecionado (FR-003c, research.md §5); salvar via `updateProduct` enviando somente os campos
      alterados — depende de T009, T011
- [X] T013 [US3] Escrever teste automatizado (Vitest + RTL) cobrindo `updateProduct` alterando
      `estoque` (ou o fluxo de salvar da tela de edição alterando estoque) — **não-negociável,
      Constituição II** — `frontend/src/services/__tests__/productService.test.js` — depende de
      T009, T012
- [X] T014 [US3] QA manual conforme quickstart.md §3: listar produtos, abrir edição pré-preenchida,
      ativar/desativar destaque, editar outros campos, editar sem trocar imagem e confirmar que a
      imagem original é preservada — depende de T012, T013

**Checkpoint**: US1 + US2 + US3 completas — feature completa e testável

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validações finais que atravessam todas as user stories

- [X] T015 [P] Rodar `cd frontend && npm run lint` e corrigir qualquer violação introduzida
      (Constituição I)
- [X] T016 [P] Rodar `cd frontend && npm run test` e confirmar que toda a suíte passa, incluindo
      T013 (Constituição II)
- [X] T017 Confirmar regressão zero no fluxo de cadastro existente conforme a seção "Regressão do
      fluxo existente" de quickstart.md (SC-005)
- [X] T018 Confirmar que o orçamento de performance da Home (<3s interativo, herdado da feature 001)
      não regrediu com a nova busca ao Firestore, usando a mesma abordagem de checagem já usada
      naquela feature (DevTools/throttling "Fast 3G")

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Vazia — nada bloqueia as user stories além do Setup
- **User Stories (Phase 3+)**: Todas dependem apenas do Setup completo
  - US1, US2 e US3 podem começar em paralelo (arquivos independentes) assim que o Setup terminar
  - Ordem recomendada por prioridade: US1 → US2 → US3
- **Polish (Phase 6)**: Depende de todas as user stories desejadas estarem completas

### Within Each User Story

- Serviço (funções Firestore) antes das telas/componentes que o consomem
- QA manual é a última task de cada story
- Em US3, o teste automatizado (T013) depende da implementação de `updateProduct` (T009) e da tela
  de edição estar minimamente funcional (T012), pois valida o fluxo real de salvar estoque

### Parallel Opportunities

- US2: T005 e T006 podem rodar em paralelo (arquivos diferentes: `productService.js` vs
  `ProductCard`)
- Polish: T015 e T016 podem rodar em paralelo
- US1, US2 e US3 podem ser trabalhadas em paralelo por pessoas diferentes assim que o Setup
  terminar (sem dependência cruzada entre elas)

---

## Parallel Example: User Story 2

```bash
# T005 e T006 podem ser feitos juntos:
Task: "Adicionar getFeaturedProducts() em frontend/src/services/productService.js"
Task: "Ajustar ProductCard para o formato real do produto em frontend/src/components/ProductCard/index.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup
2. Completar Phase 3: User Story 1
3. **PARAR e VALIDAR**: testar US1 isoladamente via quickstart.md §1
4. Já entrega o pedido mais simples e central (marcar destaque no cadastro), mesmo sem Home lendo
   do Firestore ainda ou tela de edição

### Incremental Delivery

1. Setup → infraestrutura de teste pronta
2. US1 → validar independentemente → checkbox de destaque no ar
3. US2 → validar independentemente → Home mostrando destaque real, embaralhado, com estado vazio
4. US3 → validar independentemente → listagem + edição completa de produto no ar
5. Polish → lint, suíte de testes, regressão do cadastro, performance da Home

### Parallel Team Strategy

Como não há Foundational bloqueante nem dependência cruzada entre as stories, uma equipe pode
dividir US1, US2 e US3 entre pessoas diferentes assim que o Setup (Phase 1) terminar.

---

## Notes

- [P] = arquivos diferentes, sem dependência entre si
- [Story] mapeia a task à user story correspondente para rastreabilidade
- T013 (teste de `updateProduct`/estoque) não é opcional — é exigida pela Constituição (II) porque
  esta feature altera estoque; sem ela, US3 não deve ser considerada pronta
- Esta é a primeira feature do projeto a introduzir um test runner (T002) — nenhuma infraestrutura
  de teste existia antes
