---

description: "Task list for Redesenho Premium/Luxo da Home"
---

# Tasks: Redesenho Premium/Luxo da Home

**Input**: Design documents from `/specs/001-home-luxury-redesign/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Não solicitados explicitamente no spec (feature não toca pedido/pagamento/estoque/
autenticação — a Constituição não os torna obrigatórios aqui). T028 no Polish adiciona testes
recomendados (não bloqueantes) para a única lógica nova não-trivial (carrossel + gate de
consentimento).

**Organization**: Tasks agrupadas por user story (US1/US2/US3, conforme prioridade P1/P2/P3 do
spec.md) para permitir implementação e teste independentes de cada uma.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tasks incompletas)
- **[Story]**: A qual user story a task pertence (US1, US2, US3)
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único de frontend — todos os caminhos são relativos à raiz do repo, dentro de `frontend/`
(mais `docs/design-system.md`, fora de `frontend/`).

---

## Phase 1: Setup

**Purpose**: Confirmar baseline antes de começar o redesenho

- [X] T001 Rodar `cd frontend && npm run lint` e confirmar baseline limpa (Constituição I) antes de
      qualquer mudança, para que qualquer falha nova encontrada depois seja atribuível a esta feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tokens de design e infraestrutura visual compartilhada que TODAS as user stories
dependem — nenhuma seção pode ser restilizada de forma consistente antes disso existir

**⚠️ CRITICAL**: Nenhuma task de user story pode começar antes desta fase estar completa

- [X] T002 Redefinir os tokens de cor/tipografia/radius em `frontend/src/styles/variables.css`
      conforme a tabela de `data-model.md` (`--color-black` #0B0B0C, `--color-white` #FFFFFF,
      `--color-gold` #B08D57, `--color-gold-text` #8C6D3F, `--color-text-primary` #0B0B0C,
      `--color-text-muted` #5C5C5C, `--color-text-muted-inverse` #B5B5B5, `--radius: 0`) —
      manter os nomes de variável já consumidos pelos componentes (`--primary`, `--secondary`,
      `--text`, `--text-muted`, `--background`, `--surface`, `--border`) atualizados para apontar
      para os novos valores, e adicionar os tokens novos que não têm equivalente antigo
- [X] T003 Atualizar `frontend/src/styles/theme.js`: paleta MUI (`palette.primary`, `palette.secondary`,
      `palette.background.default`) espelhando os novos tokens, e `typography.fontFamily` apontando
      para a nova fonte de corpo (sans-serif) definida em T004
- [X] T004 [P] Adicionar arquivos de fonte self-hosted (serifada para títulos + sans-serif para
      corpo) e declarações `@font-face` com `font-display: swap` + pilha de fallback de fontes de
      sistema em `frontend/src/styles/globals.css`, conforme research.md §3
- [X] T005 Substituir as cores legadas ainda hardcoded (não vinculadas a token) por referências aos
      novos tokens em `frontend/src/components/TopBar/styles.module.css` (fundo `#111827` e hover
      `#F97316` hardcoded) e `frontend/src/components/Footer/styles.module.css` (fundo `#111827`
      hardcoded) — depende de T002
- [X] T006 Atualizar `docs/design-system.md` com a paleta, tipografia, radius e a tabela de
      contraste finalizadas (Constituição III exige o documento em sincronia com a implementação) —
      depende de T002, T004

**Checkpoint**: Tokens e infraestrutura visual prontos — as user stories podem começar

---

## Phase 3: User Story 1 - Primeira impressão premium na Home (Priority: P1) 🎯 MVP

**Goal**: Hero em tela cheia com imagem estática e texto mínimo, comunicando "premium/luxo" já na
primeira tela, com a paleta e tipografia novas aplicadas.

**Independent Test**: Carregar a Home e avaliar isoladamente se hero + paleta/tipografia globais já
comunicam "premium/luxo" — sem depender de Categorias, Produtos ou Rodapé estarem prontos (spec.md).

### Implementation for User Story 1

- [X] T007 [US1] Restilizar o `HeroBanner` para hero em tela cheia com imagem estática de produto em
      alta resolução, overlay mínimo (uma tag + um título + uma frase curta + um CTA, nada além
      disso), tratamento tipográfico editorial serifado no título, e um scrim/gradiente sobre a
      imagem forte o suficiente para garantir contraste WCAG AA no texto sobreposto (FR-001, FR-014)
      — `frontend/src/components/HeroBanner/index.jsx`, `frontend/src/components/HeroBanner/styles.module.css`
- [X] T008 [P] [US1] Aplicar a nova escala de espaçamento generoso no espaço entre o Hero e a
      próxima seção em `frontend/src/pages/Home/styles.module.css` (ponto de partida do FR-007)
- [X] T009 [US1] QA manual conforme quickstart.md §1: confirmar zero azul/laranja legado e contraste
      WCAG AA no Hero e no chrome global (Header/TopBar/Navbar, já atualizados pelos tokens da
      Foundational) — depende de T007, T002

**Checkpoint**: US1 completa e testável de forma independente

---

## Phase 4: User Story 2 - Header minimalista e navegação enxuta (Priority: P2)

**Goal**: Header limpo com logo minimalista, menu reduzido a 3–4 itens essenciais, e ícones de ação
discretos/monocromáticos.

**Independent Test**: Inspecionar o header renderizado — logo sem emoji/ícone colorido, menu com
poucos itens, ícones de ação monocromáticos — independente do estado das demais seções (spec.md).

### Implementation for User Story 2

- [X] T010 [US2] Reduzir `frontend/src/data/navigation.js` para 3–4 itens essenciais de catálogo
      (ex.: Home/Novidades, Masculino, Feminino, Acessórios), removendo "Promoções" e "Contato"
      (FR-006)
- [X] T011 [US2] Restilizar o lockup da logo "Versa Store" no Header com tratamento tipográfico
      minimalista e sofisticado (sem emoji, sem ícone multicolorido), coerente com a nova paleta e
      tipografia (FR-013) — `frontend/src/components/Header/index.jsx`,
      `frontend/src/components/Header/styles.module.css`, asset da logo em
      `frontend/src/assets/`
- [X] T012 [P] [US2] Conferir e ajustar os ícones de ação do Header (busca, conta, favoritos,
      carrinho) para renderizar monocromáticos/discretos usando os novos tokens — corrigir qualquer
      cor ainda hardcoded remanescente — `frontend/src/components/Header/styles.module.css`
- [X] T013 [US2] QA manual conforme quickstart.md §2: menu com no máximo 4 itens e sem
      Contato/Promoções, logo sem emoji/ícone multicolorido, ícones monocromáticos, e o mesmo
      Header/Navbar aparecendo corretamente em uma rota fora da Home (checagem site-wide) — depende
      de T010, T011, T012

**Checkpoint**: US1 e US2 completas e testáveis de forma independente

---

## Phase 5: User Story 3 - Categorias e produtos como vitrine editorial (Priority: P3)

**Goal**: Categorias e produtos apresentados como fotografia grande em layout arejado, produtos em
carrossel navegável com hover sutil, e Rodapé completo (links reorganizados, newsletter com
consentimento, redes sociais).

**Independent Test**: Rolar até Categorias e Produtos em Destaque e verificar fotos grandes (não
ícones), carrossel navegável com hover de leve zoom, e espaçamento generoso entre as seções
(spec.md).

### Implementation for User Story 3

- [X] T014 [P] [US3] Adicionar campos `image`/`imageAlt` a cada categoria em
      `frontend/src/data/categories.js`, removendo o campo `icon` (emoji) (FR-004)
- [X] T015 [P] [US3] Preencher `image`/`imageAlt` de cada produto em
      `frontend/src/data/products.js` (campo `image` hoje vazio) (FR-005)
- [X] T016 [P] [US3] Gerar/adicionar imagens placeholder de marca (arquivo estático local, sem
      serviço de terceiro em runtime — research.md §6) para cada categoria em
      `frontend/src/assets/categories/`
- [X] T017 [P] [US3] Gerar/adicionar imagens placeholder de marca para cada produto do catálogo
      atual em `frontend/src/assets/products/` (research.md §6)
- [X] T018 [US3] Restilizar `Categories` + `CategoryCard` como grid editorial de fotos grandes
      (substituindo o tratamento de ícone), incluindo o estado de fallback para imagem ausente
      (bloco sólido preto/branco com o monograma da marca — nunca emoji) — depende de T014, T016 —
      `frontend/src/components/Categories/index.jsx`,
      `frontend/src/components/Categories/styles.module.css`,
      `frontend/src/components/CategoryCard/index.jsx`,
      `frontend/src/components/CategoryCard/styles.module.css`
- [X] T019 [US3] Reconstruir `FeaturedProducts` como carrossel navegável (CSS scroll-snap + botões
      nativos de avançar/voltar, ocultos quando todos os itens já cabem na largura visível —
      research.md §1, FR-005), com fotografia grande de produto e hover de leve zoom (transição
      suave, sem animação exagerada) — depende de T015, T017 —
      `frontend/src/components/FeaturedProducts/index.jsx`,
      `frontend/src/components/FeaturedProducts/styles.module.css`
- [X] T020 [US3] Adicionar o estado de fallback de imagem ausente ao `ProductCard` (bloco sólido com
      monograma, nunca emoji) e aplicar o tratamento visual de fotografia grande — depende de T015,
      T017 — `frontend/src/components/ProductCard/index.jsx`,
      `frontend/src/components/ProductCard/styles.module.css`
- [X] T021 [US3] Restilizar o conteúdo do `Footer`: reorganizar grupos de links incluindo "Contato"
      e "Promoções" (removidos do Navbar em T010), adicionar formulário de newsletter com checkbox
      de consentimento não pré-marcado + link para política de privacidade que só habilita o envio
      quando marcado, e adicionar links de redes sociais (FR-008) — depende de T010 —
      `frontend/src/components/Footer/index.jsx`, `frontend/src/components/Footer/styles.module.css`
- [X] T022 [P] [US3] Aplicar a escala de espaçamento generoso entre Categorias, Produtos em Destaque
      e Rodapé, completando o FR-007 (o gap Hero→próxima seção já foi feito em T008) —
      `frontend/src/pages/Home/styles.module.css`,
      `frontend/src/components/Categories/styles.module.css`,
      `frontend/src/components/FeaturedProducts/styles.module.css`
- [X] T023 [US3] QA manual conforme quickstart.md §3–4: categorias/produtos com fotos grandes (sem
      emoji/ícone), controles do carrossel ocultos com o catálogo atual (2 produtos) e operáveis por
      teclado quando visíveis, hover com zoom sutil, newsletter bloqueada até o consentimento ser
      marcado, espaçamento visivelmente generoso — depende de T018, T019, T020, T021, T022

**Checkpoint**: US1 + US2 + US3 completas — redesenho completo e testável

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validações finais que atravessam todas as user stories

- [X] T024 [P] Rodar `cd frontend && npm run lint` e corrigir qualquer violação introduzida pelo
      redesenho (Constituição I)
- [X] T025 [P] Rodar a checagem de responsividade do quickstart.md §5 em ~360px/~768px/≥1440px e
      corrigir qualquer sobreposição/corte/perda de legibilidade (FR-010)
- [X] T026 [P] Rodar a checagem de Firebase/autenticação do quickstart.md §6 (estados logado/
      deslogado no Header) e confirmar ausência de regressão funcional (FR-012)
- [X] T027 Rodar a checagem de performance do quickstart.md (DevTools/Lighthouse com throttling
      "Fast 3G") contra o orçamento de <3s interativo (SC-002) e corrigir qualquer regressão
      (estratégia de imagem/lazy-loading de research.md §2)
- [X] T028 (Opcional, recomendado, não bloqueante) Adicionar testes Vitest + React Testing Library
      para a navegação por teclado do carrossel e para o gate de consentimento do formulário de
      newsletter, conforme a recomendação de Testing em plan.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEIA todas as user stories
- **User Stories (Phase 3+)**: Todas dependem da Foundational completa
  - US1 pode começar assim que a Foundational terminar, sem depender de US2/US3
  - US2 pode começar assim que a Foundational terminar, sem depender de US1/US3
  - US3 pode começar assim que a Foundational terminar, mas T021 (Footer) depende de T010 (US2) —
    ver nota abaixo
  - Ordem recomendada por prioridade: US1 → US2 → US3
- **Polish (Phase 6)**: Depende de todas as user stories desejadas estarem completas

### Nota de dependência entre stories

US3/T021 (conteúdo do Footer) depende de US2/T010 (redução do Navbar) porque "Contato" e
"Promoções" só têm texto/link definido depois que saem do menu principal. Se US3 for implementada
antes de US2, T021 deve esperar T010 especificamente (as demais tasks de US3 não dependem de US2).

### Within Each User Story

- Dados/assets antes de componentes que os consomem (ex.: T014/T016 antes de T018)
- QA manual é a última task de cada story

### Parallel Opportunities

- Foundational: T004 pode rodar em paralelo com T002/T003 (arquivo diferente)
- US1: T008 pode rodar em paralelo com T007
- US2: T012 pode rodar em paralelo com T011 (mas ambos em Header/styles.module.css — coordenar para
  não conflitar na mesma seção do arquivo)
- US3: T014, T015, T016, T017 podem rodar todos em paralelo (arquivos de dados/assets
  independentes); T022 pode rodar em paralelo com T021
- Polish: T024, T025, T026 podem rodar em paralelo

---

## Parallel Example: User Story 3

```bash
# Dados e assets de US3 podem ser feitos juntos:
Task: "Adicionar image/imageAlt em frontend/src/data/categories.js"
Task: "Preencher image/imageAlt em frontend/src/data/products.js"
Task: "Gerar placeholders de categoria em frontend/src/assets/categories/"
Task: "Gerar placeholders de produto em frontend/src/assets/products/"
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloqueia todas as stories)
3. Completar Phase 3: User Story 1
4. **PARAR e VALIDAR**: testar US1 isoladamente via quickstart.md §1
5. Já entrega a primeira impressão "premium" pedida, mesmo sem US2/US3

### Incremental Delivery

1. Setup + Foundational → tokens/infra prontos
2. US1 → validar independentemente → primeira impressão premium no ar
3. US2 → validar independentemente → header/navegação enxuta no ar (site-wide)
4. US3 → validar independentemente → vitrine editorial + rodapé completos
5. Polish → lint, responsividade, auth, performance, testes recomendados

### Parallel Team Strategy

Com mais de uma pessoa: depois da Foundational, US1 e US2 podem ser feitas em paralelo por pessoas
diferentes (não têm dependência entre si); US3 pode começar em paralelo também, só coordenando T021
com quem estiver em T010 (US2).

---

## Notes

- [P] = arquivos diferentes, sem dependência entre si
- [Story] mapeia a task à user story correspondente para rastreabilidade
- Cada user story deve ser completável e testável de forma independente (T009, T013, T023 são os
  checkpoints de QA manual de cada uma)
- Footer e TopBar são componentes compartilhados (usados em todas as páginas via `MainLayout`) —
  por isso a limpeza de cores legadas neles está na Foundational (afeta todas as stories/páginas),
  enquanto o conteúdo novo do Footer (newsletter, links reorganizados) é uma task de US3
- Nenhuma dependência nova de runtime é introduzida (carrossel construído sem biblioteca — ver
  research.md §1)
