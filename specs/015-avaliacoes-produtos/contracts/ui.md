# Contracts — UI (015)

## Componente `StarRating` (NOVO, reutilizado)

- Props: `avg` (0–5), `count` (nº), `size` (sm/md), `showCount` (bool).
- Exibe 5 estrelas (cheia/meia/vazia via `starBreakdown`) + "(N)" quando `showCount`.
- `count === 0` → estado neutro: estrelas vazias esmaecidas + "Sem avaliações" (ou nada, conforme o contexto do card).
- Cor das estrelas nos tokens (destaque/secundária); acessível (`aria-label` "Média X de 5, N avaliações").

## Vitrine — `ProductCard`

- Abaixo do nome/preço, `StarRating` com `avg = product.ratingAvg ?? 0`, `count = product.ratingCount ?? 0`, `size="sm"`, `showCount`.
- Sem avaliações → não polui o card (estrelas vazias discretas ou omitido).

## Página do produto — `pages/Product`

- **Topo** (perto do nome/preço): `StarRating` (md) com a média + contagem; clique rola até a seção de avaliações (opcional).
- **Seção "Avaliações"** (após a descrição):
  - **Resumo**: média grande + contagem.
  - **Formulário** (`canReview`): estrelas clicáveis (1–5) + textarea (limite `COMMENT_MAX`, contador) + enviar; estados enviando/erro/enviado. Se já avaliou, o form vem preenchido com a própria (editar). Aviso quando volta a pendente após editar.
  - **Gating**: não logado → "Entre para avaliar" (link login); logado sem compra → "Só quem comprou este produto pode avaliar"; logado com compra → formulário.
  - **Lista**: avaliações **aprovadas** (estrelas, comentário, nome, data), com **"Ver mais"** (paginação por cursor). Vazio → "Ainda sem avaliações".
  - A **própria** avaliação pendente aparece com selo "Em análise" (só para o autor).

## Admin — Tela de Moderação (`/admin/avaliacoes`, `AdminRoute`)

- Reusa o padrão de lista/ações do admin (003/008/013), tokens e estados.
- **Filtro** por status (Pendentes / Aprovadas / Ocultas); **contador de pendentes** no título e (opcional) no item de nav.
- **Lista**: cada avaliação mostra produto (nome/id), nota (estrelas), comentário, autor, data, status; ações **Aprovar** / **Ocultar** / **Remover** (confirm na remoção).
- Ao aprovar/ocultar/remover → recompute da média do produto; feedback via `useFeedback`.
- **Nav**: item **"Avaliações"** no `AdminLayout` (ícone de estrela/comentário), perto de Cupons.

## Design system

`docs/design-system.md` ganha a seção **Avaliações**: componente de estrelas (card + página), formulário de avaliação (gating comprou/logado, limite do comentário, re-moderação ao editar), e a tela de moderação do admin.
