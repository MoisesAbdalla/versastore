# Feature Specification: Relatórios Ampliados do Admin (018)

**Feature Branch**: `018-relatorios-ampliados`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: enriquecer a página de Relatórios do painel com mais métricas e visões (KPIs do período com comparação, gráfico de tendência, desempenho por categoria, efetividade de cupons e mix de pagamento/entrega), sem servidor, reusando os agregados de `dailyStats`.

## Contexto

A página **/admin/reports** já tem: seletor de período (7/30/90 dias + intervalo custom), tabela de "Vendas no período" (dia/semana/mês), "Mais vendidos", "Sem vendas" e export CSV. Os agregados vivem em **`dailyStats`** (escrito na transição para `pago` do pedido — feature 009, opção C; revertido no cancelamento/devolução), guardando hoje `revenue` (total já líquido de desconto), `orderCount`, `unitsSold` e `unitsByProduct{ id: {name, units} }`. Esta feature **amplia** a análise para o lojista, mantendo a regra de ouro: **nunca varrer a coleção `orders`** — só `dailyStats` + consultas com `limit` (Constituição IV). Reusa `dashboardService`, `SalesChart`, `exportCsv` e os utilitários de data/BRL.

## Clarifications

### Session 2026-07-21

- Q: Alcance da base de dados dos relatórios? → A: **Estender o `dailyStats` (modesto)** — acumular no `pago` (revertendo no cancelamento/devolução): **total de descontos**, **mix de forma de pagamento** (Pix/cartão/boleto) e **de recebimento** (entrega/retirada), e **faturamento por categoria**. Forward-only (vale a partir do deploy; dias antigos ficam zerados, com aviso). Núcleo client-only (KPIs/deltas, gráfico, unidades por categoria, snapshot de cupons) segue retroativo.
- Q: Efetividade de cupons? → A: **Snapshot de usos** (código, tipo, usedCount, status) — retroativo, sem agregado novo. Uso/desconto por cupom por período fica fora desta feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - KPIs do período com comparação e tendência (Priority: P1) 🎯 MVP

O lojista abre Relatórios, escolhe um período (preset ou intervalo), e vê no topo **cartões de KPI** — faturamento, pedidos, unidades e **ticket médio** — cada um com a **variação percentual vs. o período anterior equivalente**. Abaixo, um **gráfico de tendência** (faturamento e pedidos ao longo do período) complementa a tabela de vendas existente.

**Why this priority**: dá a leitura executiva imediata ("como foi o período e melhorou ou piorou?") reusando dados que já existem — funciona para todo o histórico, sem tocar no caminho do pedido.

**Independent Test**: escolher "30 dias", ver os 4 KPIs com deltas vs. os 30 dias anteriores e o gráfico com a série do período; trocar para um intervalo custom e ver tudo recalcular.

**Acceptance Scenarios**:

1. **Given** um período selecionado, **When** os Relatórios carregam, **Then** aparecem 4 KPIs (faturamento, pedidos, unidades, ticket médio) com o valor do período e a variação % vs. o período anterior de mesma duração.
2. **Given** um período sem período anterior comparável (sem dados), **When** exibido, **Then** a variação mostra "—" (sem base), sem erro.
3. **Given** o período, **When** exibido, **Then** o gráfico mostra a evolução (faturamento/pedidos) coerente com a tabela de vendas.

---

### User Story 2 - Desempenho por categoria (Priority: P1)

O lojista vê uma tabela de **unidades vendidas por categoria** no período (e, se a base rica estiver disponível, o **faturamento por categoria**), ordenada da mais para a menos vendida, com **CSV**. Isso mostra quais linhas de produto puxam as vendas.

**Why this priority**: categoria é a visão de portfólio que o lojista usa para decidir compras/curadoria; é derivável dos agregados existentes (unidades) cruzados com o catálogo.

**Independent Test**: com vendas em produtos de 2+ categorias no período, ver a tabela por categoria somando as unidades corretas; exportar CSV.

**Acceptance Scenarios**:

1. **Given** vendas no período em produtos de categorias distintas, **When** a tabela por categoria carrega, **Then** cada categoria mostra o total de unidades vendidas (soma dos seus produtos), ordenada desc.
2. **Given** um produto sem categoria (ou categoria removida), **When** agregado, **Then** cai num grupo "Sem categoria" (não some do total).
3. **Given** a tabela, **When** o lojista exporta, **Then** o CSV reflete as linhas exibidas.

---

### User Story 3 - Efetividade de cupons e mix de pagamento/entrega (Priority: P2)

O lojista vê uma tabela de **cupons** (código, tipo, usos, status) para avaliar quais campanhas pegaram, e um resumo do **mix de forma de pagamento** (Pix/cartão/boleto) e **forma de recebimento** (entrega/retirada) das vendas do período. Ambos com CSV quando aplicável.

**Why this priority**: dá visão de marketing (cupons) e operacional (como os clientes pagam/recebem); parte é snapshot simples, parte depende do alcance decidido no clarify.

**Independent Test**: com cupons cadastrados e usados, ver a tabela de cupons com os usos; ver o mix de pagamento/entrega do período (conforme o alcance definido).

**Acceptance Scenarios**:

1. **Given** cupons cadastrados, **When** a tabela de cupons carrega, **Then** cada cupom mostra código, tipo, usos (usedCount) e status (ativo/expirado/esgotado/inativo).
2. **Given** vendas no período (a partir da coleta dos agregados novos), **When** o mix é exibido, **Then** mostra a distribuição por forma de pagamento e por forma de recebimento; períodos anteriores à coleta mostram estado vazio com aviso.

---

### Edge Cases

- **Sem vendas no período**: KPIs zerados, deltas "—", gráfico/tabelas com estado vazio amigável (sem erro).
- **Período anterior parcial** (histórico começa no meio): compara com o que existe; base ausente → delta "—".
- **Retroatividade da base rica**: descontos, mix e faturamento por categoria só têm dados **a partir do deploy** — dias anteriores aparecem zerados/omitidos, com aviso claro no relatório.
- **Categoria por unidades vs. faturamento**: unidades por categoria é sempre derivável (retroativo); faturamento por categoria depende da base rica.
- **Cupom removido após uso**: sai da lista de cupons (snapshot atual); o histórico de uso por período depende da base rica.
- **Constituição IV**: todas as leituras vêm de `dailyStats` (range por id) ou consultas com `limit` — **nenhuma varredura de `orders`**.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Os Relatórios MUST exibir, para o período selecionado, **KPIs** de faturamento, pedidos, unidades e **ticket médio**, cada um com a **variação % vs. o período anterior de mesma duração**; sem base de comparação → "—".
- **FR-002**: Os Relatórios MUST exibir um **gráfico de tendência** (faturamento e pedidos) do período, coerente com a tabela de vendas, reusando o componente de gráfico existente.
- **FR-003**: Os Relatórios MUST exibir **desempenho por categoria** no período: **unidades vendidas** por categoria (retroativo, do `unitsByProduct` cruzado com o catálogo) e **faturamento por categoria** (do agregado novo, forward-only), ordenado desc, com **CSV**; produtos sem categoria caem em "Sem categoria".
- **FR-004**: Os Relatórios MUST exibir uma tabela de **cupons** (código, tipo, usos acumulados, status) — snapshot atual — com **CSV**.
- **FR-005**: Os Relatórios MUST exibir o **mix de forma de pagamento** (Pix/cartão/boleto) e **de recebimento** (entrega/retirada) do período, a partir do agregado novo (forward-only), com estado vazio para períodos anteriores à coleta.
- **FR-006**: Todas as leituras MUST vir de `dailyStats` (range por id de documento) ou consultas com `limit` — **nunca** varredura de `orders` (Constituição IV).
- **FR-007**: Os relatórios atuais (Vendas no período, Mais vendidos, Sem vendas) e o seletor de período MUST ser preservados e integrados ao novo layout.
- **FR-008**: As métricas que dependem dos agregados novos (descontos, faturamento por categoria, mix de pagamento/entrega) MUST ser **forward-only** e **sinalizadas** quando o período incluir dias anteriores ao início da coleta (aviso "dados a partir de DD/MM").
- **FR-009**: A nova agregação (`discountTotal`, faturamento/unidades por categoria, contagem por forma de pagamento e de recebimento) MUST ser escrita na transição `pago` **e revertida** no cancelamento/devolução, na **mesma transação** dos agregados atuais (padrão opção C), sem quebrar a Visão geral. Para viabilizar o faturamento por categoria sem leitura extra na transição, os **itens congelados do pedido** passam a guardar a **categoria** (gravada na criação, quando o produto já é lido).
- **FR-010**: Estados carregando/erro/vazio em pt-BR em cada bloco; erro de um bloco não derruba os demais.

### Key Entities *(include if feature involves data)*

- **`dailyStats` (existente + extensão)**: `revenue`, `orderCount`, `unitsSold`, `unitsByProduct` (atuais) **+** `discountTotal`, `byCategory{ id: {name, revenue, units} }`, `byPaymentMethod{ pix, cartao, boleto }`, `byDeliveryMethod{ entrega, retirada }` (novos) — escritos no `pago`, revertidos no cancelamento/devolução.
- **Item do pedido (frozen, existente)**: ganha `categoryId`/`categoryName` (gravados na criação) para permitir o faturamento por categoria no `pago` sem leitura extra.
- **Categoria (derivada)**: agrupamento de `unitsByProduct` por `categoryId`/nome do produto (join client-side com o catálogo já carregado).
- **Cupom (existente, 013)**: `code`, `type`, `usedCount`, status derivado — lido via `listCoupons`.
- **KPI do período (derivado)**: faturamento/pedidos/unidades/ticket médio + delta vs. período anterior — calculado sobre a série do `dailyStats`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para qualquer período, o lojista vê 4 KPIs com variação vs. o período anterior e um gráfico de tendência coerente com a tabela.
- **SC-002**: A visão por categoria soma corretamente as unidades dos produtos de cada categoria no período e é exportável em CSV.
- **SC-003**: A tabela de cupons mostra usos e status de cada cupom; o mix de pagamento/entrega é exibido na granularidade definida.
- **SC-004**: Nenhuma tela de relatório varre a coleção `orders`; todas as leituras são agregados ou consultas com limite (verificável no comportamento e no código).
- **SC-005**: A Visão geral e os relatórios existentes continuam funcionando; nenhum período sem dados gera erro (só estados vazios).
- **SC-006**: uma venda paga incrementa os novos agregados (descontos, categoria, pagamento/entrega) e um cancelamento/devolução os reverte, mantendo os números consistentes com a Visão geral.

## Assumptions

- **Base client-only sobre o `dailyStats` atual** cobre KPIs+deltas, gráfico, **unidades por categoria** e **snapshot de cupons** — tudo **retroativo** ao histórico.
- **Extensão modesta do `dailyStats`** (clarify 2026-07-21): `discountTotal`, faturamento/unidades por categoria, mix de pagamento e de recebimento — escrita no `pago`, revertida no cancelamento, **forward-only** (vale a partir do deploy; períodos anteriores mostram estado vazio + aviso). Sem coleção nova (campos no doc existente) e sem leitura extra na transação (categoria vem dos itens congelados).
- Reutiliza: `dashboardService` (deltas/série/top), página Reports, `SalesChart`, `exportCsv`, utils de data/BRL, `listCoupons` (013), catálogo via `listProducts` (já carregado na página).
- Sem mudança de rules/índices para a base client-only (o range em `dailyStats` já é admin). Se estender o `dailyStats`, não há coleção nova (só campos no doc existente).
- Textos pt-BR; escala declarada: centenas de produtos, catálogo e período pequenos-médios.

### Out of Scope

- Exportação em PDF; relatórios agendados/por e-mail (M6/Blaze).
- Qualquer métrica que exija varredura de `orders` ou servidor.
- Faturamento por categoria/descontos/mix **retroativos** (impossível sem reprocessar pedidos — só forward-only via extensão).
- **Uso/desconto por cupom por período** (escolhido snapshot no clarify) — exigiria acumular por cupom no `dailyStats`.
