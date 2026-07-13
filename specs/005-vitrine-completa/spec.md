# Feature Specification: Vitrine Completa (Catálogo, Produto e Busca)

**Feature Branch**: `005-vitrine-completa`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Vitrine completa (M1): catálogo em /products com filtros por categoria, ordenação e paginação; página de produto com galeria com zoom e seletor de variação com estoque por variação; preço promocional com vigência; busca por nome, SKU e categoria; e CartContext em memória." Base validada pelo lojista em `specs/005/spec-005-vitrine-completa.md` (decisões D1–D7), com requisitos auditados contra `firestore.rules`, `firestore.indexes.json` e os services existentes.

## Contexto

M1 do roadmap de lançamento. O painel administrativo (feature 003), o modelo de dados
transacional, os services e os índices do Firestore já existem. Hoje `/products`, `/product/:id` e
`/cart` são placeholders (um `<h1>` cada) — o cliente vê a Home, mas não navega o catálogo nem
compra. Este módulo constrói a **camada de apresentação da loja** sobre a infraestrutura existente.
A vitrine é **read-only para o público**; a única escrita nova é administrativa (campo de busca,
FR-014b). Persistência de carrinho, conta do cliente, checkout e pagamento são módulos seguintes
(M2–M4).

### Decisões de escopo (validadas pelo lojista em 2026-07-12)

| # | Decisão |
|---|---------|
| D1 | Produto esgotado: **exibir com badge "Esgotado"** (não ocultar) |
| D2 | Ordenação padrão **mais recentes**; cliente reordena por **preço (↑/↓) e nome (A–Z/Z–A)** |
| D3 | Busca pela **melhor estratégia nativa disponível**, cobrindo **nome, categoria e SKU**, tolerante a caixa e acentos |
| D4 | `CartContext` **criado já no M1** (interface definitiva, implementação em memória; M2 troca só a persistência) |
| D5 | Imagens Cloudinary com transformações `f_auto,q_auto,w_` **entram no M1** |
| D6 | **Zoom na galeria entra no M1** — vitrine 100% operacional |
| D7 | Indicador "últimas unidades" **reutiliza o limiar de alerta do admin** (`lowStockThreshold` / `DEFAULT_LOW_STOCK_THRESHOLD`) |

## Clarifications

### Session 2026-07-12

- Q: Como a vitrine trata uma promoção com preço promocional definido mas sem datas de vigência
  (`promoStart`/`promoEnd` ausentes)? → A: Sem datas = **promoção sempre vigente** — o preço
  promocional aparece até o lojista removê-lo ou definir datas.
- Q: Como a busca do header dispara? → A: **Submeter no Enter/lupa** navega para `/products?q=termo`
  e renderiza a grade de resultados; sem consulta a cada tecla (nada de dropdown de sugestões ao
  vivo no M1).
- Q: Em que fuso a vigência da promoção é avaliada? → A: **Sempre no fuso America/Sao_Paulo**
  (horário de Brasília), nunca no fuso do navegador do cliente — uma promoção que termina "dia 25"
  expira no mesmo instante para todos os visitantes, independentemente do dispositivo.
- Q (analyze 2026-07-12): Escopo de composição da busca no M1? → A: Busca **compõe com o filtro de
  categoria** (índice dedicado); durante busca, a ordenação é por relevância/recência (ordenar por
  preço/nome só fora de busca). A paginação "carregar mais" preserva filtros na URL, mas não
  restaura a profundidade de scroll em deep-link.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar e filtrar o catálogo (Priority: P1)

Como visitante da loja, quero ver os produtos disponíveis em uma grade organizada, com filtro por
categoria e reordenação, para descobrir e encontrar rapidamente o que procuro.

**Why this priority**: É a porta de entrada da loja — sem catálogo navegável não há descoberta nem
caminho para a compra. É o menor incremento demonstrável do M1 e não depende de nenhuma outra
história.

**Independent Test**: Acessar `/products` com produtos ativos cadastrados, ver a grade, aplicar um
filtro de categoria e uma ordenação, conferir que a URL reflete o estado e que a paginação carrega
mais itens — sem depender da página de produto, busca ou carrinho.

**Acceptance Scenarios**:

1. **Given** existem produtos ativos, **When** acesso `/products`, **Then** vejo uma grade de cards
   com foto principal, nome e preço (e preço promocional quando vigente), ordenados por mais
   recentes.
2. **Given** um produto inativo/rascunho no admin, **When** navego o catálogo, **Then** ele **não**
   aparece.
3. **Given** um produto com estoque zerado em todas as variações, **When** navego o catálogo,
   **Then** ele aparece **com badge "Esgotado"** (D1).
4. **Given** a loja tem mais produtos que o tamanho da página, **When** chego ao fim da lista,
   **Then** posso carregar mais (paginação por cursor).
5. **Given** estou em `/products`, **When** seleciono uma categoria, **Then** a grade mostra apenas
   produtos daquela categoria e a URL reflete o filtro (ex.: `/products?categoria=<slug>`).
6. **Given** o seletor de ordenação, **When** escolho uma opção, **Then** a lista reordena por mais
   recentes (padrão), menor preço, maior preço, nome A–Z ou nome Z–A (D2).
7. **Given** filtro + ordenação combinados, **When** aplico ambos, **Then** funcionam juntos (ex.:
   categoria por menor preço).
8. **Given** acessei uma URL com filtro/ordenação, **When** a página carrega, **Then** o estado já
   vem aplicado (estado 100% na URL, compartilhável).
9. **Given** uma combinação sem resultados, **When** a aplico, **Then** vejo estado vazio amigável
   com ação de limpar filtros.

---

### User Story 2 - Ver o produto e adicionar ao carrinho (Priority: P1)

Como visitante, quero abrir a página de um produto, ver fotos com zoom, descrição e variações, e
adicionar a variação escolhida ao carrinho, para decidir e iniciar a compra.

**Why this priority**: É a tela onde a decisão de compra acontece e onde o `CartContext`
(fundação do M2/M4) é exercitado pela primeira vez. Junto com US1 forma o MVP demonstrável da
vitrine (Home → catálogo → produto → carrinho).

**Independent Test**: Abrir `/product/:id` de um produto ativo com variações, navegar a galeria com
zoom, selecionar uma variação com estoque, adicionar ao carrinho e ver o contador do header
incrementar — com produtos semeados, sem depender de busca.

**Acceptance Scenarios**:

1. **Given** um produto com múltiplas imagens, **When** acesso `/product/:id`, **Then** vejo galeria
   com imagem principal e miniaturas navegáveis.
2. **Given** a imagem principal, **When** interajo (hover/lupa no desktop; pinch ou modal ampliado
   no mobile), **Then** consigo ampliar a imagem em resolução maior (D6).
3. **Given** um produto com variações (tamanho/cor), **When** seleciono uma combinação, **Then**
   vejo o estoque **daquela variação** e o botão de compra reflete a disponibilidade.
4. **Given** não selecionei todas as opções obrigatórias, **When** clico em adicionar ao carrinho,
   **Then** sou orientado a completar a seleção.
5. **Given** uma variação disponível selecionada, **When** adiciono ao carrinho, **Then** o item
   entra no `CartContext` (em memória, D4) e recebo confirmação visual com contador no header.
6. **Given** o estoque da variação selecionada é ≤ o limiar de alerta do admin, **When** vejo o
   produto, **Then** aparece o indicador "últimas unidades" (D7).
7. **Given** um ID inexistente ou produto inativo, **When** acesso a URL, **Then** vejo um 404
   amigável com link ao catálogo (produto inativo não vaza por URL direta).

---

### User Story 3 - Buscar produtos (Priority: P2)

Como visitante, quero buscar por nome, categoria ou SKU a partir de qualquer página da loja, para
ir direto ao que procuro.

**Why this priority**: Elevada a alta prioridade pela decisão D3 (busca abrangente é diferencial de
conversão), mas depende do catálogo (US1) existir para renderizar resultados; por isso vem depois
do MVP catálogo+produto.

**Independent Test**: Digitar um termo no campo de busca do header, submeter, e ver em `/products?q=`
os produtos cujo nome (fragmento), categoria ou SKU correspondem — com e sem acentos — combinável
com filtro de categoria.

**Acceptance Scenarios**:

1. **Given** digito um termo, **When** submeto, **Then** vejo produtos cujo **nome, categoria ou
   SKU** correspondem, ignorando caixa e acentos (D3).
2. **Given** um termo parcial (ex.: "camis"), **When** busco, **Then** encontro "Camiseta"
   (correspondência por prefixo de token, não só do início do nome).
3. **Given** busca + filtro de categoria, **When** combino, **Then** o resultado respeita ambos.
4. **Given** um termo sem resultados, **When** busco, **Then** vejo estado vazio com sugestões
   (limpar busca, navegar categorias).

---

### User Story 4 - Preço promocional com vigência (Priority: P2)

Como lojista, quero que promoções apareçam somente dentro da vigência, para que o cliente nunca veja
desconto expirado ou futuro.

**Why this priority**: Regra de negócio transversal ao card e à página; agrega valor comercial mas
não é pré-requisito para navegar/comprar. Aplica-se sobre US1 e US2 já entregues.

**Independent Test**: Cadastrar um produto com promoção vigente, uma com promoção futura e uma
expirada, e conferir que só a vigente renderiza o preço promocional (no card e na página).

**Acceptance Scenarios**:

1. **Given** promoção vigente, **When** vejo o produto (card ou página), **Then** vejo preço original
   riscado + preço promocional em destaque + percentual de desconto.
2. **Given** promoção fora da vigência (futura ou expirada), **When** vejo o produto, **Then** apenas
   o preço normal aparece.
3. **Given** a promoção expira com a página aberta, **When** o pedido for criado (M4), **Then** vale
   o preço do momento da transação (fonte de verdade: preço congelado, já existente no modelo de
   pedidos).

---

### User Story 5 - Experiência mobile e percepção de qualidade (Priority: P2)

Como visitante em qualquer dispositivo, quero que a vitrine carregue rápido e funcione bem no
celular, com feedback de carregamento e erro, para confiar na loja.

**Why this priority**: Transversal a todas as telas; eleva a qualidade percebida sem ser bloqueante
para o fluxo de compra. Aplica-se sobre as histórias anteriores.

**Independent Test**: Percorrer catálogo e produto em viewport 375px sem scroll horizontal; simular
carregamento (ver skeletons) e falha de rede (ver mensagem com "tentar novamente").

**Acceptance Scenarios**:

1. **Given** acesso mobile, **When** navego catálogo e produto, **Then** o layout é utilizável sem
   zoom forçado nem scroll horizontal (o zoom da galeria por pinch continua funcionando).
2. **Given** carregamento em andamento, **When** os dados não chegaram, **Then** vejo skeletons.
3. **Given** erro de rede, **When** a consulta falha, **Then** vejo mensagem com ação de tentar
   novamente.

---

### Edge Cases

- Produto ativo com **todas** as variações zeradas: aparece no catálogo com badge "Esgotado" (D1) e
  na página com o botão de compra desabilitado, mas continua acessível (não é 404).
- Produto **sem** variações (estoque simples) zerado: mesmo tratamento de "Esgotado".
- Produto inativo/rascunho/excluído acessado por URL direta: 404 amigável — a leitura é **negada
  pela camada de dados** (rules), então o serviço trata "permissão negada" como não-encontrado, sem
  vazar existência.
- Categoria no filtro que não existe mais (URL antiga): estado vazio com ação de limpar filtros, sem
  erro.
- Busca com termo de 1–2 caracteres: exige mínimo de 3 caracteres (ou mostra dica), evitando
  varredura ampla.
- Promoção com preço promocional definido mas **sem datas de vigência**: considerada **sempre
  vigente** (o preço promocional aparece até o lojista remover o preço promocional ou definir
  datas). Promoção só é ocultada quando há datas e o momento atual está fora da janela.
- Falha no carregamento da imagem (URL Cloudinary quebrada): fallback visual do card/galeria, sem
  quebrar o layout.
- Produto com o campo `searchKeywords` ainda ausente (legado antes do backfill): não deve sumir do
  catálogo — apenas pode não ser encontrado por busca até o backfill rodar.

## Requirements *(mandatory)*

### Functional Requirements

**Catálogo (`/products`)**

- **FR-001**: A vitrine MUST listar somente produtos ativos (não excluídos), ordenados por mais
  recentes por padrão, com paginação por cursor.
- **FR-002**: Cada card MUST exibir imagem principal (transformada pelo Cloudinary no tamanho do
  card — D5/FR-018), nome, preço, preço promocional vigente quando houver, badge "Esgotado" (D1) e
  o ícone de wishlist existente (visual; funcional só na Fase C).
- **FR-003**: A vitrine MUST permitir filtrar por categoria via query param, com o estado inicial
  lido da URL.
- **FR-004**: A vitrine MUST oferecer ordenação por mais recentes (padrão), menor preço, maior
  preço, nome A–Z e nome Z–A (D2). As combinações (categoria + cada ordenação) MUST ser atendidas
  por índices compostos do Firestore — verificar/criar os ausentes em `firestore.indexes.json`.
- **FR-005**: O catálogo MUST tratar os estados de carregamento (skeleton grid), vazio (com ação de
  limpar filtros) e erro (com "tentar novamente").

**Página de produto (`/product/:id`)**

- **FR-006**: A página MUST exibir galeria com imagem principal e miniaturas navegáveis, com **zoom**
  na principal — lupa/hover no desktop e pinch-to-zoom ou modal ampliado no mobile (D6); a imagem de
  zoom MUST ser carregada em resolução maior via transformação Cloudinary dedicada.
- **FR-007**: A página MUST exibir nome, descrição, categoria (com link para o catálogo filtrado),
  preço e preço promocional vigente.
- **FR-008**: A página MUST oferecer seletor de variação por atributo; combinações sem estoque MUST
  ser desabilitadas/sinalizadas; o estoque MUST ser exibido **por variação** selecionada.
- **FR-009**: O botão "Adicionar ao carrinho" MUST ser funcional sobre o `CartContext` (D4):
  validar seleção e disponibilidade, adicionar ao estado em memória e dar feedback visual +
  contador no header. Persistência e a página `/cart` completa ficam no M2.
- **FR-010**: A página MUST exibir indicador "últimas unidades" quando o estoque da variação for ≤ o
  limiar de alerta do admin (D7 — reutilizar `lowStockThreshold` do produto, com fallback em
  `DEFAULT_LOW_STOCK_THRESHOLD`).
- **FR-011**: A página MUST exibir um 404 amigável para produto inexistente, inativo, rascunho ou
  excluído, sem vazar a existência do produto.

**Busca (D3)**

- **FR-012**: A loja MUST ter um campo de busca no header, presente em todas as páginas da vitrine.
  A busca MUST disparar ao submeter (tecla Enter ou clique na lupa), navegando para
  `/products?q=termo` — sem consulta a cada tecla nem dropdown de sugestões ao vivo no M1.
- **FR-013**: Os resultados MUST ser exibidos em `/products` via `?q=termo`, **componível com o
  filtro de categoria**. Durante uma busca ativa, os resultados são ordenados por relevância/recência
  (mais recentes) — a ordenação por preço/nome fica disponível apenas fora de busca (limitação de
  índice do Firestore documentada no plano, R-9). Sem busca, todas as ordenações do FR-004 valem.
- **FR-014**: A correspondência MUST cobrir nome (tokens com prefixo), categoria e SKU, normalizada
  (minúsculas, sem acentos), reutilizando o normalizador de tokens compartilhado já existente.
- **FR-014b**: O produto MUST ganhar o campo `searchKeywords` (array de tokens normalizados
  derivados de nome + SKU + nome da categoria), mantido pelo service de produto do **admin** ao
  criar/editar, com **script de backfill idempotente** para os produtos existentes. Nenhuma escrita
  pública é introduzida — a escrita cai na regra admin-only já existente. *(Estratégia recomendada:
  `array-contains` sobre tokens; se o plano identificar limitação de índice relevante, avaliar
  alternativa antes de recorrer a serviço externo.)*

**Transversais**

- **FR-015**: A feature MUST NOT introduzir nenhuma nova permissão de **escrita pública** nas
  security rules; a auditoria MUST confirmar que a leitura pública expõe apenas produtos ativos e
  categorias (estado já vigente após a feature 003 — reconfirmar antes de codar).
- **FR-016**: A vitrine MUST reutilizar os services do admin onde aplicável e criar variantes
  públicas quando a consulta do admin expõe o que a vitrine não deve ver (ex.: forçar
  `status == "ativo"`).
- **FR-017**: Cada rota e cada produto MUST definir `document.title` próprio (base para o SEO do
  M7).
- **FR-018**: Todas as imagens da vitrine MUST usar transformações Cloudinary
  (`f_auto,q_auto,w_{contexto}`) para card, miniatura, imagem principal e zoom (D5).
- **FR-019**: O `CartContext` (D4) MUST expor a interface definitiva —
  `addItem(produto, variação, qtd)`, `removeItem`, `updateQty`, `items`, `subtotal`, `count` — com
  validação de estoque ao adicionar; a implementação do M1 é em memória e o M2 injeta persistência
  sem alterar os consumidores.

### Key Entities

- **Produto**: leitura pública (somente ativos/não excluídos). **Ganha o campo `searchKeywords`**
  (array de tokens normalizados de nome + SKU + nome da categoria), escrito apenas pelo admin e
  preenchido por backfill. Demais campos (nome, preço, promoção, imagens, variações, estoque,
  status) já existem.
- **Variação**: leitura do estoque por combinação de atributos; determina disponibilidade e o
  indicador de "últimas unidades".
- **Categoria**: leitura para filtro, navegação e como fonte de token de busca.
- **Promoção** (campos do produto): preço promocional e vigência; renderizada apenas dentro da
  janela válida.
- **Carrinho** (novo, client-side): estado em memória via `CartContext`; não persiste no Firestore
  no M1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um visitante vai da Home → catálogo → filtro → produto → variação → **item no
  carrinho** em ≤ 5 toques, sem erros.
- **SC-002**: Um produto inativo é inacessível por lista, busca e URL direta (verificado por teste
  automatizado).
- **SC-003**: Uma promoção fora de vigência nunca renderiza preço promocional (testes: antes,
  durante e depois da janela), com a vigência avaliada no fuso America/Sao_Paulo — verificado por
  teste com o relógio simulado em fuso diferente do de Brasília.
- **SC-004**: Uma variação esgotada nunca tem o botão de compra habilitado (teste automatizado).
- **SC-005**: Filtro (categoria) + busca + ordenação são preservados ao compartilhar a URL. A
  profundidade de paginação ("carregar mais") não é restaurada em deep-link — a URL compartilhada
  abre na primeira página com os mesmos filtros.
- **SC-006**: A busca encontra produto por fragmento de nome (≥ 3 letras), por SKU exato e por nome
  de categoria, com e sem acentos (testes automatizados).
- **SC-007**: O zoom é funcional no desktop (hover/lupa) e no mobile (pinch/modal), verificado nos
  dois contextos.
- **SC-008**: Nenhuma ampliação de escrita pública nas rules; a suíte existente (127 testes)
  permanece verde, somada aos novos testes da vitrine; o backfill de `searchKeywords` é idempotente.
- **SC-009**: Catálogo e página de produto utilizáveis em viewport de 375px sem scroll horizontal.

## Assumptions

- **Vigência da promoção** (fixado na clarificação de 2026-07-12): uma promoção é vigente quando
  existe preço promocional menor que o preço normal E — se houver datas — o momento atual está
  dentro de `promoStart`–`promoEnd`. **Sem datas, a promoção é sempre vigente.** A promoção só é
  ocultada quando há datas e o momento está fora da janela. A vigência MUST ser avaliada no fuso
  **America/Sao_Paulo** (horário de Brasília) — nunca no fuso do navegador do cliente — para que uma
  promoção expire no mesmo instante para todos os visitantes. Regra de fim de dia já é tratada pelo
  cadastro (feature 003, mesmo fuso).
- **Origem dos produtos**: o catálogo é populado pelo painel admin (feature 003); para validação,
  usar produtos ativos com variações e imagens já cadastrados.
- **Segurança já vigente**: as security rules (pós-feature 003) já restringem a leitura pública de
  `products` a `status == "ativo" && deleted == false` e a escrita a admin — FR-015 audita e
  reconfirma, não introduz mudança de postura.
- **Índices**: as combinações `deleted + status + {createdAt, price, nameLower}` e as variantes com
  `categoryId` já existem em `firestore.indexes.json` (herdadas do admin); o plano deve verificar a
  direção do ordenar por preço↓/nome Z–A e adicionar o índice de `searchKeywords`.
- **Busca nativa**: assume-se que `array-contains` sobre `searchKeywords` atende a escala declarada
  (centenas de produtos); serviço externo (Algolia/Typesense) fica fora de escopo e só entra se a
  estratégia nativa se provar insuficiente.
- **Carrinho**: o estado do carrinho no M1 vive apenas em memória (perde-se ao recarregar) — a
  persistência é responsabilidade explícita do M2, sem alterar a interface do `CartContext`.
- **Reuso visual**: o `ProductCard` e as seções da Home existentes servem de base para o catálogo,
  mantendo a identidade visual da loja.

## Out of Scope

- Persistência do carrinho em localStorage e página `/cart` completa (M2).
- Login, conta e histórico de pedidos do cliente (M3).
- Checkout e pagamento (M4).
- Wishlist funcional, avaliações e produtos relacionados (Fase C).
- Serviço de busca externo — só se a estratégia nativa se provar insuficiente.
- SEO avançado / pre-render (M7 — FR-017 apenas prepara o terreno).
