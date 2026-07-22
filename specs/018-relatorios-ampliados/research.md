# Research — Relatórios Ampliados (018)

Decisões (Fase 0). Formato: Decisão / Racional / Alternativas.

## R-1 — Extensão modesta e forward-only do `dailyStats`

**Decisão**: acrescentar ao doc `dailyStats/{dia}` os campos: `discountTotal` (soma de `order.discount`), `byCategory{ id: {name, revenue, units} }` (faturamento e unidades por categoria), `byPaymentMethod{ pix, cartao, boleto }` e `byDeliveryMethod{ entrega, retirada }` (contagem de pedidos). Escritos na transição `pago` e revertidos no cancelamento/devolução, **na mesma transação** e no mesmo ponto que os agregados atuais (`applyStatsDelta`, direction ±1). `emptyStats()` passa a incluí-los zerados.

**Racional**: reusa exatamente o mecanismo consolidado da opção C (feature 009) — consistência automática com a Visão geral e reversão no cancelamento. Sem coleção nova, sem rules/índices. Forward-only é inerente (dias anteriores não têm os campos → lidos como 0).

**Alternativas**: recalcular a partir de `orders` (proibido — Constituição IV, varredura); coleção de agregados separada (mais superfície, sem ganho). Rejeitadas.

**Edge (reversão assimétrica)**: um pedido **pago antes** do deploy (não somou os campos novos) e **cancelado depois** faria o revert `-1` subtrair de campos que nunca somou. Mitigação: `Math.max(0, …)` piso em 0 e remoção de entradas zeradas (como já é com `unitsByProduct`) — sem corrupção, só possível leve subcontagem transitória de uma categoria/método na janela do deploy. Aceito e documentado (limitação forward-only).

## R-2 — Faturamento por categoria sem leitura extra no `pago`

**Decisão**: `createOrder` grava `categoryId`/`categoryName` em cada **item congelado** (o `product` já é lido na criação para preço/estoque). No `pago`, `applyStatsDelta` agrega `byCategory` a partir desses campos dos itens — **zero leitura adicional** na transição. Receita por categoria = soma de `unitPrice × quantity` dos itens da categoria (bruto de item, antes do desconto de pedido, que é medido à parte em `discountTotal`).

**Racional**: a transação do `pago` não pode fazer N leituras de produtos (custo/limite). Congelar a categoria no item resolve e ainda mantém o histórico do pedido correto se a categoria do produto mudar depois.

**Alternativas**: ler cada produto no `pago` (N reads na transação — rejeitada); atribuir o desconto rateado por categoria (complexidade sem pedido do lojista — rejeitada; desconto fica no total `discountTotal`).

## R-3 — Unidades por categoria retroativas (client-side)

**Decisão**: para o histórico anterior à extensão, as **unidades por categoria** são derivadas no client cruzando `getTopProducts` (productId→unidades, do `unitsByProduct`) com o catálogo (`categoryName` do produto, já carregado na página). O **faturamento** por categoria vem do `byCategory` novo (forward-only). A tabela mostra ambos; faturamento "—" para períodos sem coleta.

**Racional**: entrega valor imediato (unidades) sobre todo o histórico sem depender da extensão; o faturamento acompanha à medida que os dias novos entram.

## R-4 — KPIs do período + comparação

**Decisão**: `getPeriodReport(from,to)` lê o range de `dailyStats` (uma range query por id — a mesma de hoje) e soma `revenue/orderCount/unitsSold/discountTotal`; `ticket médio = revenue/orderCount`. Para os deltas, soma o **período anterior de mesma duração** (janela imediatamente antes de `from`) e calcula a variação % (sem base → `null` → UI mostra "—"). Espelha a lógica de `withDerived`/deltas já usada na Visão geral.

**Racional**: reusa o mecanismo testado da Visão geral; uma leitura de range cobre período + comparação (estendendo o `from` para trás uma duração).

## R-5 — Mix de pagamento/entrega

**Decisão**: `byPaymentMethod`/`byDeliveryMethod` são contagens de pedidos por chave, somadas no range e exibidas como distribuição (contagem + %). Forward-only; período sem coleta → estado vazio com aviso "dados a partir de DD/MM".

**Racional**: contagem de pedidos é a leitura de mix mais simples e clara; faturamento por método pode entrar depois se pedido (fora do escopo modesto).

## R-6 — Cupons por snapshot

**Decisão**: tabela via `listCoupons` (013) — código, tipo, `usedCount`, status derivado (`couponStatus`) — snapshot atual, com CSV. Uso/desconto por período fica fora (exigiria acumular por cupom no agregado).

**Racional**: entrega a leitura de "qual campanha pegou" com o que já existe, retroativo, sem novo agregado (decisão do clarify).

## R-7 — Aviso de forward-only

**Decisão**: `getPeriodReport` devolve `coverageStart` (o 1º dia do range que tem os campos novos, ou null). Os blocos que dependem da extensão (mix, faturamento por categoria, descontos) exibem "Dados a partir de DD/MM" quando o período começa antes disso, e estado vazio se nenhum dia coberto.

## Resumo de impacto
- `dailyStats` ganha campos (aditivo); `applyStatsDelta`/`emptyStats` estendidos; `createOrder` congela a categoria no item. **Sem** rules/índices/coleção novos.
- Reports ganha KPIs+delta, gráfico, categoria (unidades retroativas + faturamento forward), cupons (snapshot), mix (forward). Visão geral intacta.
- Testes no caminho da venda (aplica/reverte) + cálculos de período/categoria.
