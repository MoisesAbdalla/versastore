# Quickstart: Validação da Vitrine Completa

**Feature**: 005-vitrine-completa | **Date**: 2026-07-12

Referências: [data-model.md](./data-model.md), [contracts/services.md](./contracts/services.md),
[contracts/firestore.md](./contracts/firestore.md).

## Pré-requisitos

```powershell
cd C:\VersaStore\frontend
npm install
npm run dev        # loja + painel em http://localhost:5173
```

- Índice N1 publicado: `npx firebase-tools deploy --only firestore:indexes --project versa-store-2eb1a`
  (aguardar "Enabled" no console antes de testar busca).
- Backfill de `searchKeywords` executado (dev, logado como admin):
  `await backfillSearchKeywords()` no console do navegador — depois conferir alguns produtos no
  Firestore.
- Base com produtos ativos (com e sem variações, com imagens), ao menos um esgotado, ao menos um
  com promoção vigente e um com promoção expirada, e categorias com produtos.

## Gates automatizados

```powershell
cd C:\VersaStore\frontend
npm run lint       # oxlint — zero erros
npm run test       # Vitest — 127 baseline + novos da vitrine (SC-008)
npm run build      # bundle da loja íntegro
```

## 0. Auditoria de segurança (FR-015 / SC-008)

| Passo | Esperado |
|---|---|
| Rules Playground: `get /products/{ativo}` como anônimo | Permitido |
| Rules Playground: `get /products/{inativo}` como anônimo | **Negado** (base do 404) |
| Rules Playground: `update /products/{id}.searchKeywords` como anônimo | **Negado** |
| `git diff firestore.rules` | **Sem alterações** (nenhuma escrita pública nova) |

## 1. Catálogo (US1)

| Passo | Esperado |
|---|---|
| Abrir `/products` | Grade de cards (foto transformada, nome, preço), mais recentes primeiro; skeletons durante a carga |
| Produto inativo/rascunho no admin | **Não** aparece na grade |
| Produto com todas as variações zeradas | Aparece com badge **"Esgotado"** |
| Rolar até o fim e "carregar mais" | Próxima página é anexada (cursor) |
| Selecionar categoria | Grade filtra; URL vira `/products?categoria=<slug>` |
| Trocar ordenação (recentes/preço↑/preço↓/nome↑/nome↓) | Ordem muda; cada uma sem erro de índice |
| Categoria + ordenação juntas | Funcionam combinadas |
| Recarregar a URL com filtro+ordenação | Estado restaurado |
| Combinação sem resultados | Estado vazio com ação de limpar filtros |
| DevTools Network | Nenhuma leitura de produto inativo; consultas com `limit` |

## 2. Página de produto (US2)

| Passo | Esperado |
|---|---|
| Abrir `/product/:id` de produto ativo | Galeria (principal + miniaturas), nome, descrição, categoria (link), preço |
| Zoom desktop (hover/lupa na principal) | Amplia região sob o cursor em resolução maior |
| Zoom mobile (375px): tocar imagem | Modal com imagem grande; pinch-to-zoom nativo funciona |
| Selecionar variação | Mostra estoque **daquela** variação; botão reflete disponibilidade |
| Variação esgotada | Opção desabilitada/sinalizada; botão de compra desabilitado (SC-004) |
| Estoque da variação ≤ limiar do admin | Indicador "últimas unidades" (D7) |
| Clicar "adicionar" sem escolher variação | Orientação para completar a seleção |
| Adicionar variação disponível | Item entra no carrinho; contador do header incrementa |
| Abrir `/product/{inativo}` ou id inexistente | 404 amigável com link ao catálogo (não vaza existência) |

## 3. Preço promocional (US4)

| Passo | Esperado |
|---|---|
| Produto com promoção vigente | Preço normal riscado + promocional em destaque + % desconto (card e página) |
| Produto com promoção futura ou expirada | Só o preço normal |
| Produto com `promoPrice` sem datas | Tratado como **sempre vigente** |
| Teste automatizado de fuso | Data-limite avaliada em America/Sao_Paulo — mesmo resultado com relógio simulado em outro fuso (SC-003) |

## 4. Busca (US3)

| Passo | Esperado |
|---|---|
| Digitar termo no header e pressionar Enter | Vai para `/products?q=termo` e mostra resultados |
| Buscar fragmento de nome ("camis") | Encontra "Camiseta" (prefixo de token ≥ 3) |
| Buscar por SKU exato | Encontra o produto |
| Buscar por nome de categoria | Encontra produtos da categoria |
| Buscar com acento vs sem acento | Mesmo resultado (normalizado) |
| Termo sem resultados | Estado vazio com sugestões (limpar busca, navegar categorias) |
| Produto sem `searchKeywords` (pré-backfill) | Continua no catálogo; só não é achado por busca até rodar o backfill |

## 5. Carrinho em memória (US2 / FR-019)

| Passo | Esperado |
|---|---|
| Adicionar 2 variações diferentes do mesmo produto | Duas linhas distintas; `count` = soma |
| Adicionar a mesma variação de novo | Soma quantidade na linha existente |
| Tentar exceder o estoque da variação | Bloqueado (não passa de `maxStock`) |
| Abrir `/cart` (mínimo do M1) | Lista itens + subtotal (página completa é M2) |
| Recarregar a página | Carrinho zera (memória — persistência é M2) |

## 6. Mobile, qualidade e regressão (US5 / SC-009 / SC-008)

| Passo | Esperado |
|---|---|
| Todos os fluxos em viewport 375px | Sem scroll horizontal; zoom por pinch ok |
| Carregamento | Skeletons no catálogo e no produto |
| DevTools offline ao abrir catálogo/produto | Mensagem amigável + "tentar novamente" |
| `document.title` por rota/produto | Título reflete a página/produto (base SEO M7) |
| Home, login, registro, `/admin` | **Inalterados** — mesmas rotas e visual; painel intacto |
| Suíte completa | 127 baseline + novos verdes |
