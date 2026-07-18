# Feature Specification: Avaliações de Produtos (015)

**Feature Branch**: `015-avaliacoes-produtos`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: avaliações de produtos — clientes avaliam produtos com nota (1–5 estrelas) e comentário; a média de estrelas aparece na vitrine e na página do produto; o lojista modera. Sem gateway/servidor (client + Firestore + rules), sem depender do Blaze.

## Contexto

A loja já tem vitrine, página de detalhe do produto (`ProductCard` + página do produto), área de conta e um painel de admin com padrão de tabelas/moderação (categorias 003, variações 008, frete 011, cupons 013). Esta feature adiciona **prova social**: avaliações (nota + comentário) por produto, com **média denormalizada** no produto para exibição barata na vitrine, e **moderação** pelo lojista. É 100% client + Firestore + regras (sem Cloud Functions/Blaze). Segue os mesmos padrões de segurança das features anteriores: o cliente escreve só o próprio dado; agregados sensíveis (a média do produto) são aplicados pelo **admin** para não serem forjáveis.

## Clarifications

### Session 2026-07-18

- Q: Como as avaliações são moderadas? → A: **Pré-moderação** — nasce pendente e só aparece após o admin aprovar; a média do produto é aplicada pelo admin ao aprovar (cliente não forja).
- Q: Quem pode avaliar? → A: **Só quem comprou** — o cliente precisa ter um pedido (não cancelado) contendo o produto. A checagem é no client (as rules não cruzam documentos) e é forjável → dívida endurecida no M4b/servidor.
- Q: Onde a média aparece? → A: **Vitrine (cards) + página do produto**, via campos denormalizados `ratingAvg`/`ratingCount` no produto.
- Q: Editar uma avaliação já aprovada? → A: **Volta a pendente** (re-moderação) e sai da média até ser reaprovada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cliente avalia um produto (Priority: P1) 🎯 MVP

Na página de um produto que **já comprou**, o cliente logado escolhe uma **nota de 1 a 5 estrelas** e, opcionalmente, escreve um **comentário**, e envia. Ele tem **uma** avaliação por produto — se já avaliou, vê a própria avaliação e pode **editá-la**. Um visitante não logado vê o convite para entrar; um cliente que não comprou o produto vê que só quem comprou pode avaliar. A avaliação entra em **moderação** (nasce pendente) e passa a aparecer publicamente após aprovada.

**Why this priority**: é a entrada de dados que alimenta toda a feature; sem ela não há o que exibir nem moderar. Testável isoladamente.

**Independent Test**: logar, abrir um produto, dar 4 estrelas + comentário, enviar; reabrir e ver a própria avaliação (pendente) e conseguir editá-la para 5 estrelas.

**Acceptance Scenarios**:

1. **Given** um cliente logado na página do produto, **When** dá 5 estrelas + comentário e envia, **Then** a avaliação é gravada como **pendente** e ele vê a confirmação e a própria avaliação.
2. **Given** um cliente que já avaliou o produto, **When** volta à página, **Then** vê a própria avaliação e pode **editar** nota/comentário (continua uma só).
3. **Given** um visitante não logado, **When** tenta avaliar, **Then** é convidado a entrar/cadastrar (sem formulário de avaliação disponível).
4. **Given** um cliente logado que **não comprou** o produto, **When** abre a página, **Then** vê que só quem comprou pode avaliar (sem formulário).
5. **Given** uma avaliação sem nota, **When** tenta enviar, **Then** é bloqueada com aviso (nota 1–5 obrigatória); comentário acima do limite de tamanho é recusado.

---

### User Story 2 - Lojista modera avaliações (Priority: P1)

O lojista abre uma tela de **Avaliações** no painel, vê as **pendentes** (com contador), e pode **aprovar**, **ocultar** (reprovar) ou **remover** cada uma. Ao **aprovar**, a avaliação passa a aparecer publicamente e a **média/contagem do produto** é atualizada; ao **ocultar/remover** uma já aprovada, a média é recalculada de acordo.

**Why this priority**: sem moderação, avaliações abusivas apareceriam publicamente; a média do produto só é confiável se o admin controla o que entra. Depende da US1 (precisa haver avaliações).

**Independent Test**: com avaliações pendentes, aprovar uma → ela aparece na página do produto e a média sobe; ocultar outra → não aparece; remover → some da lista.

**Acceptance Scenarios**:

1. **Given** avaliações pendentes, **When** o lojista abre a tela, **Then** vê a lista com contador de pendentes e as ações (aprovar/ocultar/remover).
2. **Given** uma avaliação pendente, **When** o lojista **aprova**, **Then** ela fica pública e a **média + contagem** do produto refletem a nova nota.
3. **Given** uma avaliação aprovada, **When** o lojista **oculta** ou **remove**, **Then** ela some da vitrine/página e a **média + contagem** são recalculadas.

---

### User Story 3 - Cliente vê a média e as avaliações (Priority: P2)

Na **vitrine** (card do produto) e na **página do produto**, o cliente vê a **média de estrelas** e a **quantidade** de avaliações. Na página do produto, vê também a **lista** das avaliações aprovadas (nota, comentário, nome do cliente, data), com **limite/paginação**. Produto sem avaliações mostra um estado neutro ("Ainda sem avaliações").

**Why this priority**: é a entrega da prova social ao comprador; depende de haver avaliações aprovadas (US1+US2), mas é um incremento separado de exibição.

**Independent Test**: um produto com 3 avaliações aprovadas (4, 5, 5) mostra "média 4,7 · 3 avaliações" no card e na página, com a lista das três; um produto sem avaliações mostra o estado neutro.

**Acceptance Scenarios**:

1. **Given** um produto com avaliações aprovadas, **When** aparece na vitrine, **Then** o card mostra a média (estrelas) e a contagem.
2. **Given** a página do produto, **When** carrega, **Then** mostra a média + contagem e a lista de avaliações aprovadas (nota, comentário, nome, data), limitada/paginada.
3. **Given** um produto sem avaliações aprovadas, **When** exibido, **Then** mostra "Ainda sem avaliações" (sem estrelas quebradas).

---

### Edge Cases

- **Recalcular a média com precisão**: a média é derivada só das avaliações **aprovadas**; aprovar/ocultar/remover recalcula `ratingAvg`/`ratingCount` do produto. A média exibida é arredondada para 1 casa; as estrelas podem mostrar meia-estrela.
- **Editar uma avaliação já aprovada**: volta para **pendente** e some da lista pública na hora; a **média** do produto recalcula na próxima moderação do admin (escrita do agregado é só admin) — evita burlar a moderação editando depois, ao custo de uma defasagem momentânea de uma avaliação na média.
- **Produto removido/soft-deleted**: avaliações de um produto inexistente/oculto não aparecem na vitrine; a tela de moderação ainda as lista para limpeza.
- **Comentário vazio**: permitido (avaliação só com nota); nota vazia não.
- **"Compra verificada" forjável**: se a regra for "só quem comprou", a checagem é no client (as rules não cruzam documentos) e é **contornável** — dívida pré-lançamento, endurecida no M4b/servidor. Documentado.
- **Nome do cliente**: exibir o primeiro nome (ou nome) do perfil; não expor e-mail.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Um cliente logado MUST poder criar uma avaliação de um produto com **nota 1–5** (obrigatória) e **comentário** (opcional, com limite de tamanho).
- **FR-002**: O sistema MUST garantir **uma avaliação por cliente por produto** (id determinístico, ex.: `productId_uid`); reenviar **edita** a existente.
- **FR-003**: Uma avaliação nova MUST nascer **pendente** (pré-moderação) e só aparecer publicamente após **aprovada**.
- **FR-004**: O lojista MUST poder **aprovar**, **ocultar** e **remover** avaliações, e ver as **pendentes** com um contador.
- **FR-005**: Ao **aprovar** (ou ao ocultar/remover uma aprovada), o sistema MUST atualizar a **média (`ratingAvg`) e a contagem (`ratingCount`)** do produto, derivadas apenas das avaliações **aprovadas**. Essa atualização é feita pelo **admin** (não pelo cliente), para a média não ser forjável.
- **FR-006**: A **vitrine (card)** e a **página do produto** MUST exibir a **média de estrelas + contagem** (via `ratingAvg`/`ratingCount` denormalizados no produto); sem avaliações, um estado neutro ("Ainda sem avaliações").
- **FR-007**: A **página do produto** MUST listar as avaliações **aprovadas** (nota, comentário, nome do cliente, data), com **limite/paginação**.
- **FR-008**: A **leitura pública** MUST expor apenas avaliações **aprovadas**; pendentes/ocultas são visíveis só para o admin (e a própria, para o autor).
- **FR-009**: O cliente MUST poder **ver e editar a própria** avaliação (inclusive enquanto pendente); editar nota/comentário de uma **aprovada** a devolve para **pendente** — ela **sai da lista pública na hora** (a lista filtra só aprovadas). A **média denormalizada** do produto, por ser escrita só pelo admin (FR-005/FR-012), é **recalculada na próxima ação de moderação** — pode ficar momentaneamente desatualizada por uma avaliação, sem o cliente conseguir forjá-la. (Endurecimento em tempo real fica para o M4b/servidor.)
- **FR-010**: Só pode avaliar quem **comprou** o produto: o cliente MUST ter ao menos um **pedido não cancelado** contendo o `productId`. A checagem é feita no client lendo os próprios pedidos (as rules não cruzam documentos → forjável, dívida endurecida no M4b). Quem não comprou não vê o formulário.
- **FR-011**: Validação: nota 1–5 obrigatória; comentário até um limite de caracteres; estados carregando/erro/enviado em pt-BR.
- **FR-012**: A escrita de avaliação MUST ser restrita ao **próprio autor** (criar/editar a sua); a **moderação** e a **média do produto** são escrita **admin**.

### Key Entities *(include if feature involves data)*

- **Avaliação (review)**: uma nota + comentário de um cliente sobre um produto. Atributos: `id` (determinístico `productId_uid`), `productId`, `userId`, `userName` (denormalizado p/ exibir), `rating` (1–5), `comment` (texto, pode ser vazio), `status` (`pendente` | `aprovada` | `oculta`), `createdAt`, `updatedAt`. Uma por (produto, cliente).
- **Produto** (existente): ganha os agregados **denormalizados** `ratingAvg` (0–5, 1 casa) e `ratingCount` (nº de avaliações aprovadas), atualizados pelo admin na moderação. Usados na vitrine e na página.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um cliente logado cria e edita a própria avaliação (nota + comentário) de um produto, com validação (nota 1–5 obrigatória).
- **SC-002**: Uma avaliação só aparece publicamente após aprovada; pendentes/ocultas não vazam para a vitrine/página.
- **SC-003**: O lojista aprova/oculta/remove avaliações e vê as pendentes com contador; ao moderar, a média e a contagem do produto refletem apenas as aprovadas.
- **SC-004**: A vitrine e a página do produto mostram a média de estrelas + contagem; produto sem avaliações mostra estado neutro (sem estrelas quebradas).
- **SC-005**: Um cliente não consegue publicar diretamente (sem moderação) nem forjar a média de um produto.
- **SC-006**: A página do produto lista as avaliações aprovadas com paginação/limite, sem carregar tudo de uma vez.

## Assumptions

- **Moderação = pré-moderação** (avaliação nasce pendente; admin aprova) — o admin aplica a média denormalizada, o cliente não a forja (clarify 2026-07-18).
- **Quem avalia = só quem comprou** — o cliente precisa de um pedido não cancelado com o produto (clarify 2026-07-18). Como o M4a permite o admin marcar pedidos como pago/enviado/entregue, há compras utilizáveis mesmo sem o M4b. A checagem é no client (lê os próprios pedidos) e é **forjável** — dívida endurecida no M4b/servidor.
- **Média nos cards da vitrine + página** via `ratingAvg`/`ratingCount` denormalizados no produto — leitura barata, sem consultar avaliações por card (clarify 2026-07-18).
- **Editar avaliação aprovada → volta a pendente** (re-moderação) (clarify 2026-07-18).
- **Uma avaliação por (produto, cliente)** com id determinístico; editar substitui.
- Reutiliza: a página do produto e o `ProductCard` (estrelas), o padrão de tabela/moderação do admin (003/008/011/013), o design system, e o padrão "admin escreve o produto" (agregados).
- Nova coleção `reviews` + campos aditivos no produto; requer **ajuste/deploy das rules** (passo manual do lojista, como no M4a/013). Provável necessidade de **índice** (avaliações aprovadas por produto, ordenadas por data) — confirmado no plano.
- Textos em pt-BR; estados carregando/erro/vazio; validação campo a campo.

### Out of Scope

- Fotos/mídia nas avaliações.
- Resposta do lojista à avaliação; voto de "avaliação útil".
- Notificação por e-mail de nova avaliação (M6 — depende do Blaze).
- Qualquer processamento de pagamento (M4b).
- Endurecimento server-side da "compra verificada" e da moderação (fica com o M4b/Blaze).
