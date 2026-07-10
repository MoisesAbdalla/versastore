# Phase 1 Data Model: Redesenho Premium/Luxo da Home

Esta feature é uma mudança de apresentação visual, não de domínio de negócio — não há novo
serviço, banco de dados ou fluxo de compra. As "entidades" abaixo são os dados estáticos de UI já
existentes em `frontend/src/data/`, com os campos que passam a ser exigidos pelo redesenho, mais o
conjunto de tokens de design que passa a ser a fonte de verdade visual (substituindo os valores
atuais de `docs/design-system.md`).

## Category (`frontend/src/data/categories.js`)

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `id` | number | sim | já existe |
| `name` | string | sim | já existe |
| `icon` | string (emoji) | — | **removido** — substituído por `image` (FR-004, SC-005) |
| `image` | string (caminho do asset) | sim (novo) | foto grande da categoria; placeholder aceitável agora (research.md §6) |
| `imageAlt` | string | sim (novo) | texto alternativo descritivo, para acessibilidade e para o estado de fallback |

## Product (`frontend/src/data/products.js`)

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `id` | number | sim | já existe |
| `title` | string | sim | já existe |
| `category` | string | sim | já existe |
| `price` / `oldPrice` | number | sim | já existem, sem mudança |
| `image` | string (caminho do asset) | sim (antes vazio) | passa a ser preenchido; placeholder aceitável agora |
| `imageAlt` | string | sim (novo) | texto alternativo descritivo |
| `rating` / `stock` | number | sim | já existem, sem mudança |

**Estado de fallback** (Edge Case do spec): quando `image`/`imageAlt` não estiverem preenchidos
para um item, o card MUST exibir um placeholder neutro consistente com a nova paleta (ex.: bloco
`--color-black`/`--color-white` com o monograma da marca centralizado) — nunca voltar a emoji ou
ícone colorido, e nunca quebrar as dimensões do grid/carrossel.

## NavigationItem (`frontend/src/data/navigation.js`)

Reduzido de 6 para os itens essenciais decididos na clarificação (FR-006). Estrutura do registro
não muda (`id`, `title`, `path`), só o conteúdo da lista:

| Antes (6 itens) | Depois (3–4 itens) |
|---|---|
| Home, Categorias, Masculino, Feminino, Promoções, Contato | Home (ou "Novidades"), Masculino, Feminino, Acessórios |

"Contato" e "Promoções" saem da navegação principal e passam a existir como links no Footer
(FR-008).

## NewsletterSubscription (estado de formulário, sem persistência)

Introduzida apenas como estado de UI no Footer — **não** cria uma nova coleção Firebase nem um
endpoint de backend (fora do escopo deste redesenho visual; ver Assumptions do spec).

| Campo | Tipo | Notas |
|---|---|---|
| `email` | string | validado como formato de e-mail antes de habilitar o envio |
| `consentAccepted` | boolean | checkbox **não pré-marcado**; envio MUST ficar desabilitado até `true` (FR-008) |

## Design Tokens (`frontend/src/styles/variables.css` + `theme.js`, espelhados em `docs/design-system.md`)

Substituem integralmente os tokens atuais (`--primary` #1E3A8A, `--secondary` #F97316, etc.) — ver
justificativa de contraste em research.md §4.

| Token | Valor | Substitui |
|---|---|---|
| `--color-black` | `#0B0B0C` | (novo — fundo escuro) |
| `--color-white` | `#FFFFFF` | `--surface` |
| `--color-gold` | `#B08D57` | `--secondary` (#F97316) |
| `--color-gold-text` | `#8C6D3F` | (novo — texto dourado normal sobre branco) |
| `--color-text-primary` | `#0B0B0C` | `--text` (#111827) |
| `--color-text-muted` | `#5C5C5C` | `--text-muted` (#6B7280) |
| `--color-text-muted-inverse` | `#B5B5B5` | (novo — texto secundário sobre preto) |
| `--radius` | `0` | `2px` (a linha "editorial" fica ainda mais reta) |
| `--tracking` | `.14em` (mantido) | já existente, reaproveitado nos novos títulos |
| `--font-heading` | família serifada (a definir em `docs/design-system.md`) | `Poppins` nos títulos |
| `--font-body` | família sans-serif (a definir em `docs/design-system.md`) | `Poppins` no corpo |

`--primary` (#1E3A8A) e `--secondary` (#F97316) são removidos de todo uso visual na Home e nos
componentes compartilhados (SC-003); qualquer ocorrência remanescente é um bug de implementação.
