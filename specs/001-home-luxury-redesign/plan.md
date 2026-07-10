# Implementation Plan: Redesenho Premium/Luxo da Home

**Branch**: `001-home-luxury-redesign` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-home-luxury-redesign/spec.md`

## Summary

Redesenhar a identidade visual da Versa Store (Home + os componentes de layout compartilhados
Header/Navbar/Footer, que por isso passam a valer para o site inteiro) para uma estética de moda
premium/luxo: paleta preto/branco + dourado, tipografia editorial (serifada nos títulos + sans no
corpo), hero em tela cheia com imagem estática, categorias e produtos em destaque como vitrine
fotográfica grande (produtos em carrossel navegável), rodapé com newsletter (com consentimento
LGPD) e redes sociais, e navegação reduzida a 3–4 itens essenciais. É uma mudança de apresentação
visual sobre a estrutura de componentes já existente — sem novo modelo de dados, sem alterar o
fluxo de autenticação Firebase, sem novo serviço de backend.

## Technical Context

**Language/Version**: JavaScript (ES2022+), React 19.2

**Primary Dependencies**: Vite 8, MUI v9 (`@mui/material`, `@mui/icons-material`, `@mui/lab`) com
Emotion, `react-router-dom` v7, Firebase SDK v12 (somente estado de auth já usado no Header),
`oxlint` para lint. Nenhuma dependência nova de runtime é introduzida (ver research.md — carrossel
é construído sem biblioteca externa).

**Storage**: N/A — dados de UI vêm de `frontend/src/data/{categories,products,navigation}.js`
(estáticos); Firebase é usado apenas para estado de autenticação já exibido no Header, inalterado
por esta feature.

**Testing**: Nenhum test runner configurado ainda em `frontend/`. Esta feature não altera lógica de
pedido/pagamento/estoque/autenticação (o gatilho que torna testes automatizados obrigatórios pela
Constituição, princípio II) — é redesenho visual. Como boa prática (não bloqueante), recomenda-se
adicionar testes Vitest + React Testing Library para a única lógica nova não-trivial introduzida:
navegação por teclado do carrossel e o gate de consentimento do formulário de newsletter.

**Target Platform**: Web responsivo (evergreen browsers), do mobile (~360px) ao desktop (≥1440px)

**Project Type**: Web frontend único (a feature só toca `frontend/src`; não há mudança de backend)

**Performance Goals**: Manter o orçamento já exigido pela Constituição (IV) e pelo spec (SC-002):
interativo em menos de 3s em perfil de celular intermediário com "Fast 3G" — mesmo com imagens
grandes em tela cheia no hero e fotografia grande em categorias/produtos.

**Constraints**:
- Contraste mínimo WCAG AA (4.5:1 texto normal, 3:1 texto grande) em toda a Home (FR-014/SC-006).
- Reaproveitar a árvore de componentes já existente (`frontend/src/pages/Home` e
  `frontend/src/components/{Header,Navbar,Footer,TopBar,HeroBanner,Categories,CategoryCard,
  FeaturedProducts,ProductCard}`), sem nova arquitetura de página (FR-011).
- Não alterar/quebrar a integração com Firebase já usada no Header (FR-012).
- `oxlint` deve continuar limpo.
- `docs/design-system.md` MUST ser atualizado no mesmo PR (exigência da Constituição III, já que a
  paleta muda de azul/laranja para preto/branco/dourado).

**Scale/Scope**: 1 página (Home) + 3 componentes de layout compartilhados (Header, Navbar, Footer)
que passam a valer em todas as rotas do site. Catálogo atual (mock): 4 categorias, 2 produtos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|---|---|---|
| I. Code Quality & Maintainability | PASS | Componentes existentes continuam pequenos/single-purpose; nenhuma dependência nova; `oxlint` permanece o gate de lint. |
| II. Testing Standards | PASS (não aciona a regra) | Feature não toca pedido/pagamento/estoque/autenticação — a regra "NON-NEGOTIABLE" da Constituição não se aplica. Testes para carrossel/consentimento são recomendados, não bloqueantes. |
| III. User Experience Consistency | PASS condicional | A Constituição exige que `docs/design-system.md` seja atualizado no mesmo PR sempre que a UI se desviar dele — é exatamente esse o caso aqui (nova paleta/tipografia). Phase 1 já produz o novo conjunto de tokens; a implementação MUST aplicar essa atualização ao documento. |
| IV. Performance Requirements | PASS condicional | Hero em tela cheia + fotografia grande é um risco real para o orçamento de <3s. Phase 0 resolve a estratégia de otimização de imagem (formato, `srcset`, lazy-loading abaixo da dobra) e a abordagem do carrossel (sem biblioteca nova) antes da implementação. |

Nenhum gate é uma violação não justificada → **Complexity Tracking não se aplica** (tabela omitida).

**Re-check pós-Phase 1**: as duas condições ficaram resolvidas pelos artefatos de design —
III (UX Consistency) tem seu conjunto completo de tokens novos em [data-model.md](./data-model.md),
pronto para ser espelhado em `docs/design-system.md` durante a implementação; IV (Performance) tem
a estratégia de imagem/carrossel/fontes resolvida em [research.md](./research.md) sem nenhuma nova
dependência de runtime. Os quatro princípios ficam **PASS** sem ressalvas para seguir à Phase 2.

## Project Structure

### Documentation (this feature)

```text
specs/001-home-luxury-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

Não há `contracts/` — esta feature não expõe nem consome nenhuma interface externa nova (sem novo
endpoint de backend, sem novo contrato de API); é puramente uma mudança de apresentação sobre dados
já existentes.

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── pages/
│   │   └── Home/
│   │       ├── index.jsx              # composição da página (mantida)
│   │       └── styles.module.css      # espaçamento entre seções da Home
│   ├── components/
│   │   ├── TopBar/                    # ajuste de paleta (compartilhado, site-wide)
│   │   ├── Header/                    # logo minimalista + navegação reduzida (compartilhado)
│   │   ├── Navbar/                    # 3–4 itens (compartilhado)
│   │   ├── Footer/                    # links + newsletter + redes sociais (compartilhado)
│   │   ├── HeroBanner/                # hero em tela cheia, imagem estática
│   │   ├── Categories/                # grid editorial
│   │   ├── CategoryCard/              # foto grande por categoria
│   │   ├── FeaturedProducts/          # carrossel navegável
│   │   └── ProductCard/               # foto grande por produto, hover com zoom leve
│   ├── data/
│   │   ├── categories.js              # + campo de imagem por categoria
│   │   ├── products.js                # campo `image` passa a ser preenchido
│   │   └── navigation.js              # reduzido a 3–4 itens essenciais
│   ├── styles/
│   │   ├── variables.css              # novos tokens: preto/branco/dourado, tipografia, radius 0
│   │   ├── theme.js                   # paleta MUI espelhando variables.css
│   │   └── globals.css                # @font-face dos novos tipos (self-hosted, font-display: swap)
│   └── assets/
│       ├── categories/                # novas imagens placeholder de categoria
│       └── products/                  # novas imagens placeholder de produto

docs/
└── design-system.md                   # atualizado com a nova paleta/tipografia/tokens
```

**Structure Decision**: Projeto único de frontend (não há opção "web application" com backend
próprio nesta feature — o `backend/` do monorepo não é tocado). Todo o trabalho acontece dentro de
`frontend/src`, reaproveitando os componentes e arquivos de dados já existentes, mais a atualização
de `docs/design-system.md` exigida pela Constituição.
