# Implementation Plan: Produto em Destaque (Admin + Home)

**Branch**: `002-adicionar-campo-produto-destaque` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-adicionar-campo-produto-destaque/spec.md`

## Summary

Adicionar um campo booleano `destaque` ao produto, editável no Admin (cadastro já existente +
edição nova, incluindo uma listagem de produtos que também não existe hoje), e trocar a seção
"Produtos em Destaque" da Home de dados mockados para uma busca real no Firestore filtrando
`destaque == true`, embaralhada a cada carregamento, com estado vazio ("Em breve") quando não há
nenhum. Como a edição inclui alterar estoque, a Constituição (II) torna testes automatizados
obrigatórios para essa lógica — este projeto ainda não tem nenhum test runner configurado, então
esta feature também introduz Vitest + React Testing Library (já previstos pela Constituição, nunca
implantados).

## Technical Context

**Language/Version**: JavaScript (ES2022+), React 19.2

**Primary Dependencies**: Vite 8, `firebase` v12 (Firestore: já usado só para escrita via
`createProduct`; esta feature adiciona leitura com `query`/`where`/`getDocs` e atualização com
`updateDoc`/`getDoc`), MUI v9 (Checkbox, Table/List para a listagem nova), `react-router-dom` v7
(novas rotas de listagem/edição no Admin), serviço Cloudinary existente (`cloudinaryService.js`,
upload de imagem, reaproveitado condicionalmente por causa do FR-003c). **Nova dependência de
dev**: Vitest + React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `jsdom`)
— exigida pela Constituição (II) porque esta feature altera lógica de estoque.

**Storage**: Firestore, coleção `products` (já existente). Nenhuma migração de dados — documentos
antigos sem `destaque` continuam sem o campo até serem editados manualmente (FR-007, já assumido no
spec).

**Testing**: Vitest + React Testing Library, introduzidos por esta feature. Cobertura obrigatória
(Constituição II, não-negociável): a função de atualização de produto que altera `estoque` (e,
transitivamente, o fluxo de salvar a tela de edição) MUST ter teste automatizado antes de ser
considerada pronta. Demais partes (listagem, checkbox de destaque isolado, shuffle da Home) não são
obrigatórias pela Constituição, mas herdam a mesma infraestrutura de teste já configurada.

**Target Platform**: Web (mesmo alvo já estabelecido pelo projeto)

**Project Type**: Frontend único (a feature só toca `frontend/src`; Firestore é o único "backend",
sem servidor próprio no projeto)

**Performance Goals**: A nova busca de produtos em destaque na Home MUST manter o orçamento de
performance já exigido (Constituição IV, feature 001): interativa em menos de 3s em perfil de
celular intermediário com "Fast 3G". Uma única consulta Firestore com filtro de igualdade simples
(sem `orderBy` combinado) não exige índice composto e é leve o suficiente para não ameaçar esse
orçamento.

**Constraints**:
- FR-003c: seleção de nova imagem é opcional na edição (mantém a imagem atual quando nada é
  selecionado) — diferente da regra do cadastro, onde a imagem é obrigatória.
- MUST reaproveitar `frontend/src/services` e `frontend/src/firebase` já existentes, sem introduzir
  uma camada de acesso a dados paralela.
- MUST NOT quebrar o fluxo de cadastro de produto já funcional.
- MUST corrigir a incompatibilidade de forma de dados descoberta na pesquisa (ver research.md §4):
  os documentos reais do Firestore usam `name` (não `title`) e não têm `oldPrice`/`rating` —
  `ProductCard` hoje assume esses campos e quebraria com dado real.
- `oxlint` deve continuar limpo.

**Scale/Scope**: Admin é uma ferramenta interna de baixo tráfego (sem paginação necessária para o
catálogo atual); a Home é a superfície de maior tráfego e já tem o orçamento de performance da
feature 001 a respeitar.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|---|---|---|
| I. Code Quality & Maintainability | PASS condicional | Reaproveita padrões de serviço já existentes; a correção do mismatch `title`/`name` e `oldPrice`/`rating` ausentes (research.md §4) precisa ser feita de forma limpa (adaptar `ProductCard` ao dado real), não just "papered over" com valores inventados. |
| II. Testing Standards | **GATE REAL — não é dispensado desta vez** | Esta feature altera lógica de estoque (edição de produto) — a regra "NON-NEGOTIABLE" da Constituição se aplica. Phase 0 decide como introduzir Vitest + React Testing Library (já nomeados pela própria Constituição como a ferramenta prevista) e Phase 2 (tasks) MUST incluir pelo menos um teste cobrindo a função de atualização de produto/estoque antes de ser considerada pronta. |
| III. User Experience Consistency | PASS | Checkbox de destaque, listagem e tela de edição MUST usar os tokens já estabelecidos em `docs/design-system.md`/MUI theme (paleta preto/branco/dourado, radius 0) — nenhuma estilização ad hoc nova. |
| IV. Performance Requirements | PASS | Consulta Firestore com filtro de igualdade simples é leve; não deve ameaçar o orçamento de <3s já validado na feature 001. |

Nenhum gate é uma violação não justificada → **Complexity Tracking não se aplica** (a introdução do
test runner é conformidade com a Constituição, não uma exceção a ser justificada).

**Re-check pós-Phase 1**: research.md resolve a estratégia de teste (Vitest + RTL, o que testar
exatamente) e a correção do mismatch de dados; data-model.md documenta o novo campo e o contrato dos
serviços novos/alterados. Os quatro princípios ficam **PASS** para seguir à Phase 2.

## Project Structure

### Documentation (this feature)

```text
specs/002-adicionar-campo-produto-destaque/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── product-service.md   # contrato das funções novas/alteradas de frontend/src/services/productService.js
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── Admin/
│   │   │   ├── index.jsx                  # cadastro (existente) + checkbox de destaque (FR-001/002)
│   │   │   ├── ProductList/               # NOVO — listagem de produtos (FR-003)
│   │   │   │   └── index.jsx
│   │   │   ├── ProductEdit/                # NOVO — formulário de edição (FR-003a/b/c)
│   │   │   │   └── index.jsx
│   │   │   └── ImageUploader/              # existente — ajustado para aceitar imagem já salva (URL) além de File
│   │   └── Home/                           # inalterado (composição já existente)
│   ├── components/
│   │   ├── FeaturedProducts/               # trocar fonte de dado mockada por Firestore + shuffle + estado vazio (FR-004/005/006)
│   │   └── ProductCard/                    # ajustar para o formato real do produto (name, sem oldPrice/rating obrigatórios)
│   ├── services/
│   │   └── productService.js               # + getFeaturedProducts, getProducts, getProduct, updateProduct
│   ├── firebase/                           # inalterado (firestore.js já exporta `db`)
│   └── routes/
│       └── index.jsx                       # + rotas /admin/products (listagem) e /admin/products/:id (edição)

frontend/src/services/__tests__/ ou frontend/src/pages/Admin/ProductEdit/__tests__/
└── (novo) teste da função/fluxo de atualização de produto (Constituição II)
```

**Structure Decision**: Continua um único projeto de frontend (sem backend próprio). O trabalho se
concentra em `frontend/src/services/productService.js` (novas funções Firestore), duas telas novas
dentro de `frontend/src/pages/Admin/`, e ajustes em `frontend/src/components/FeaturedProducts` e
`ProductCard` para consumir dado real. É a primeira feature do projeto a introduzir um test runner.
