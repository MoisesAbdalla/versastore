# Feature Specification: Vitrine Completa (Catálogo, Produto e Busca)

**Feature Branch:** `005-vitrine-completa`
**Criado em:** 2026-07-12 · **Validado em:** 2026-07-12
**Status:** ✅ Validado pelo lojista — pronto para /speckit-plan
**Contexto:** M1 do roadmap. O painel admin, o modelo de dados, os services e os índices do Firestore já existem. Este módulo constrói a camada de apresentação da loja sobre a infraestrutura existente. A vitrine é **read-only para o público**; a única escrita nova é administrativa (campo de busca — ver FR-014b).

---

## ⚡ Resumo executivo

Hoje `/products`, `/product/:id` e `/cart` são placeholders. Este módulo entrega a experiência completa de descoberta e decisão de compra: **catálogo navegável com filtros, ordenação e paginação; página de produto com galeria com zoom e seleção de variação; preços promocionais com vigência; e busca por nome, SKU e categoria**. O botão "adicionar ao carrinho" é entregue funcional sobre um `CartContext` em memória — o M2 apenas troca a persistência.

---

## 📌 Decisões de escopo (validadas pelo lojista em 2026-07-12)

| # | Decisão |
|---|---------|
| D1 | Produto esgotado: **exibir com badge "Esgotado"** (não ocultar) |
| D2 | Ordenação padrão: **mais recentes**; cliente pode reordenar por **preço (↑/↓) e nome (A–Z/Z–A)** |
| D3 | Busca pela **melhor estratégia disponível**, cobrindo **nome, categoria e SKU**, tolerante a caixa e acentos |
| D4 | `CartContext` **criado já no M1** com implementação em memória (interface definitiva; M2 troca só a persistência) |
| D5 | Imagens são Cloudinary → **transformações `f_auto,q_auto,w_` entram no M1** |
| D6 | **Zoom na galeria entra no M1** — vitrine 100% operacional |
| D7 | Indicador "últimas unidades" **reutiliza o limiar de alerta do admin** |

---

## 👥 Histórias de usuário

### US-1 — Navegar o catálogo (P1)
**Como** visitante da loja, **quero** ver todos os produtos disponíveis em uma grade organizada, **para** descobrir o que a loja vende.

**Cenários de aceitação:**
1. **Dado** que existem produtos ativos, **quando** acesso `/products`, **então** vejo uma grade de cards com foto principal, nome, preço (e preço promocional quando vigente).
2. **Dado** que um produto está inativo/rascunho no admin, **quando** navego o catálogo, **então** ele **não** aparece.
3. **Dado** um produto com estoque zerado em todas as variações, **quando** navego o catálogo, **então** ele aparece **com badge "Esgotado"** (D1).
4. **Dado** que a loja tem mais produtos que o tamanho da página, **quando** chego ao fim da lista, **então** posso carregar mais (paginação por cursor).

### US-2 — Filtrar e ordenar (P1)
**Como** visitante, **quero** filtrar por categoria e reordenar os resultados, **para** encontrar rapidamente o que procuro.

**Cenários de aceitação:**
1. **Dado** que estou em `/products`, **quando** seleciono uma categoria, **então** a grade mostra apenas produtos daquela categoria e a URL reflete o filtro (`/products?categoria=camisetas`).
2. **Dado** que acessei uma URL com filtro/ordenação, **quando** a página carrega, **então** o estado já vem aplicado (estado 100% na URL).
3. **Dado** o seletor de ordenação, **quando** escolho uma opção, **então** a lista reordena por: **mais recentes (padrão), menor preço, maior preço, nome A–Z, nome Z–A** (D2).
4. **Dado** filtro + ordenação combinados, **quando** aplico ambos, **então** funcionam juntos (ex.: categoria "camisetas" por menor preço).
5. **Dado** que uma combinação não retorna produtos, **quando** a aplico, **então** vejo estado vazio amigável com ação de limpar filtros.

### US-3 — Ver detalhes do produto (P1)
**Como** visitante, **quero** abrir a página de um produto e ver fotos, descrição, variações e preço, **para** decidir a compra.

**Cenários de aceitação:**
1. **Dado** um produto com múltiplas imagens, **quando** acesso `/product/:id`, **então** vejo galeria com imagem principal e miniaturas navegáveis.
2. **Dado** a imagem principal, **quando** interajo (hover no desktop / pinch ou toque no mobile), **então** consigo **ampliar (zoom)** a imagem (D6).
3. **Dado** um produto com variações (tamanho/cor), **quando** seleciono uma combinação, **então** vejo o estoque **daquela variação** e o botão de compra reflete a disponibilidade.
4. **Dado** que não selecionei todas as opções obrigatórias, **quando** clico em adicionar ao carrinho, **então** sou orientado a completar a seleção.
5. **Dado** uma variação disponível selecionada, **quando** adiciono ao carrinho, **então** o item entra no `CartContext` (em memória, D4) e recebo confirmação visual com contador no header.
6. **Dado** um ID inexistente ou produto inativo, **quando** acesso a URL, **então** vejo 404 amigável com link ao catálogo (produto inativo não vaza por URL direta).

### US-4 — Preço promocional com vigência (P1)
**Como** lojista, **quero** que promoções apareçam somente dentro da vigência, **para** que o cliente nunca veja desconto expirado ou futuro.

**Cenários de aceitação:**
1. **Dado** promoção vigente, **quando** vejo o produto (card ou página), **então** vejo preço original riscado + preço promocional em destaque + percentual de desconto.
2. **Dado** promoção fora da vigência, **quando** vejo o produto, **então** apenas o preço normal aparece.
3. **Dado** que a promoção expira com a página aberta, **quando** o pedido for criado (M4), **então** vale o preço do momento da transação (fonte de verdade: preço congelado, já existente no modelo).

### US-5 — Buscar produtos (P1, elevado de P2 por D3)
**Como** visitante, **quero** buscar por nome, categoria ou SKU, **para** ir direto ao que procuro.

**Cenários de aceitação:**
1. **Dado** que digito um termo, **quando** submeto, **então** vejo produtos cujo **nome, categoria ou SKU** correspondem, ignorando caixa e acentos (D3).
2. **Dado** um termo parcial (ex.: "camis"), **quando** busco, **então** encontro "Camiseta" (correspondência por prefixo de token, não só do início do nome).
3. **Dado** busca + filtro de categoria, **quando** combino, **então** o resultado respeita ambos.
4. **Dado** termo sem resultados, **quando** busco, **então** vejo estado vazio com sugestões (limpar busca, navegar categorias).

### US-6 — Experiência mobile e percepção de qualidade (P1)
**Como** visitante em qualquer dispositivo, **quero** que a vitrine carregue rápido e funcione bem no celular, **para** confiar na loja.

**Cenários de aceitação:**
1. **Dado** acesso mobile, **quando** navego catálogo e produto, **então** o layout é utilizável sem zoom forçado/scroll horizontal (o zoom da galeria por pinch continua funcionando).
2. **Dado** carregamento em andamento, **quando** os dados não chegaram, **então** vejo skeletons.
3. **Dado** erro de rede, **quando** a consulta falha, **então** vejo mensagem com ação de tentar novamente.

---

## 📋 Requisitos funcionais

### Catálogo (`/products`)
- **FR-001:** Listar somente produtos ativos, padrão **mais recentes primeiro**, paginação por cursor.
- **FR-002:** Card: imagem principal (Cloudinary com `f_auto,q_auto,w_` no tamanho do card — D5), nome, preço, preço promocional vigente, badge "Esgotado" (D1), coração de wishlist existente (visual; funcional na Fase C).
- **FR-003:** Filtro por categoria via query param, estado inicial lido da URL.
- **FR-004:** Ordenação: mais recentes · menor preço · maior preço · nome A–Z · nome Z–A (D2). Índices compostos necessários (categoria + cada ordenação) devem ser verificados/criados em `firestore.indexes.json`.
- **FR-005:** Estados: carregando (skeleton grid), vazio, erro (retry).

### Página de produto (`/product/:id`)
- **FR-006:** Galeria: imagem principal + miniaturas; **zoom** na principal — lupa/hover no desktop, pinch-to-zoom ou modal ampliado no mobile (D6). Imagem de zoom carregada em resolução maior via transformação Cloudinary dedicada.
- **FR-007:** Nome, descrição, categoria (link para catálogo filtrado), preço e promocional vigente.
- **FR-008:** Seletor de variação por atributo; combinações sem estoque desabilitadas/sinalizadas; estoque exibido **por variação**.
- **FR-009:** Botão "Adicionar ao carrinho" **funcional sobre o `CartContext`** (D4): valida seleção e disponibilidade, adiciona ao estado em memória, feedback visual + contador no header. Persistência (localStorage) e página `/cart` completa ficam no M2.
- **FR-010:** Indicador "últimas unidades" quando estoque da variação ≤ **limiar de alerta do admin** (D7 — reutilizar a mesma configuração/constante).
- **FR-011:** 404 amigável para produto inexistente ou inativo.

### Busca (D3)
- **FR-012:** Campo de busca no header da loja (todas as páginas da vitrine).
- **FR-013:** Resultados em `/products` via `?q=termo`, componível com categoria e ordenação.
- **FR-014:** Correspondência por **nome (tokens com prefixo), categoria e SKU**, normalizada (minúsculas, sem acentos).
- **FR-014b (escrita administrativa):** Produto ganha campo `searchKeywords` (array de tokens normalizados derivados de nome + SKU + nome da categoria), mantido pelo service de produto do **admin** ao criar/editar, com **script de backfill** para os produtos existentes. Nenhuma escrita pública é introduzida. *(Estratégia recomendada: `array-contains` sobre tokens + prefix-match; se o plano identificar limitação relevante nos índices, avaliar alternativa no /speckit-plan antes de recorrer a serviço externo.)*

### Transversais
- **FR-015:** Nenhuma nova permissão de **escrita pública** nas security rules; auditar que a leitura pública expõe apenas produtos ativos e categorias.
- **FR-016:** Reutilizar services do admin onde aplicável; criar variantes públicas quando a consulta do admin expõe o que a vitrine não deve ver.
- **FR-017:** `document.title` por rota e por produto (base para SEO do M7).
- **FR-018:** Todas as imagens da vitrine via transformações Cloudinary (`f_auto,q_auto,w_{contexto}`): card, miniatura, principal e zoom (D5).
- **FR-019:** `CartContext` (D4): interface definitiva — `addItem(produto, variação, qtd)`, `removeItem`, `updateQty`, `items`, `subtotal`, `count` — com validação de estoque ao adicionar; implementação M1 em memória; M2 injeta persistência sem alterar consumidores.

---

## 🗃️ Entidades envolvidas

| Entidade | Uso | Mudança |
|---|---|---|
| Produto | Leitura pública | **+ campo `searchKeywords`** (escrito só pelo admin; backfill) |
| Variação | Leitura (estoque por combinação) | — |
| Categoria | Leitura (filtro/navegação/busca) | — |
| Promoção | Leitura com checagem de vigência | — |
| Carrinho (novo, client-side) | Estado em memória via `CartContext` | Não persiste no Firestore |

---

## ✅ Critérios de sucesso (mensuráveis)

- **SC-01:** Visitante vai da Home → catálogo → filtro → produto → variação → **item no carrinho** em ≤ 5 toques, sem erros.
- **SC-02:** Produto inativo inacessível por lista, busca e URL direta (teste automatizado).
- **SC-03:** Promoção fora de vigência nunca renderiza preço promocional (testes: antes/durante/depois).
- **SC-04:** Variação esgotada nunca tem botão de compra habilitado (teste automatizado).
- **SC-05:** Filtro + busca + ordenação + página preservados ao compartilhar URL.
- **SC-06:** Busca encontra produto por fragmento de nome (≥3 letras), por SKU exato e por nome de categoria, com e sem acentos (testes automatizados).
- **SC-07:** Zoom funcional em desktop (hover/lupa) e mobile (pinch/modal), verificado nos dois contextos.
- **SC-08:** Nenhuma ampliação de escrita pública nas rules; suíte existente (127 testes) verde + novos testes da vitrine; backfill de `searchKeywords` idempotente.

---

## 🚫 Fora de escopo (explicitamente)

- Persistência do carrinho em localStorage e página `/cart` completa (M2)
- Login/conta/pedidos do cliente (M3)
- Checkout e pagamento (M4)
- Wishlist funcional, avaliações, produtos relacionados (Fase C)
- Serviço de busca externo (Algolia/Typesense) — só se a estratégia nativa se provar insuficiente
- SEO avançado/pre-render (M7 — FR-017 prepara o terreno)

---

## 📎 Notas para o /speckit-plan

1. **Índices:** mapear em `firestore.indexes.json` as combinações necessárias — (ativo, createdAt), (ativo, preço), (ativo, nome), e as versões com categoria; criar as ausentes.
2. **Busca:** implementar normalizador de tokens compartilhado (mesmo código no write do admin, no backfill e no parsing da query) para garantir simetria.
3. **Backfill:** script único, idempotente, executável pelo admin — decidir se via página interna do painel ou script Node local.
4. **Rules:** auditoria da leitura pública **antes** de codar (SC-08).
5. **Reuso visual:** ProductCard e seções da Home como base do catálogo.
6. **Zoom:** preferir solução leve (CSS transform + posição do cursor / modal com pinch) antes de adicionar dependência; se biblioteca for necessária, justificar no plano.
