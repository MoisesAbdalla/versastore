# Quickstart — Relatórios Ampliados (018)

Validação ponta a ponta. `npm run dev`/`test`/`lint`/`build` em `frontend/`. **Sem deploy de rules/índices.**

## Pré-requisitos
- Admin logado. Para os blocos forward-only (categoria-faturamento, mix, descontos), **crie e pague** pedidos DEPOIS do deploy desta feature (dias antigos não têm os campos novos).

## 1. KPIs + gráfico (US1)
1. Admin → Relatórios, período "30 dias" → 4 KPIs (faturamento, pedidos, unidades, ticket médio), cada um com variação % vs. os 30 dias anteriores; sem base → "—".
2. Gráfico de tendência coerente com a tabela "Vendas no período". Trocar para intervalo custom → tudo recalcula.
3. Período sem vendas → KPIs zerados, deltas "—", gráfico vazio (sem erro).

## 2. Categoria (US2)
1. Pague pedidos com produtos de 2+ categorias → tabela por categoria com **unidades** (soma correta) ordenada desc; produto sem categoria em "Sem categoria".
2. **Faturamento** por categoria aparece para os dias cobertos (com aviso "a partir de DD/MM" se o período começa antes). CSV exporta as linhas exibidas.

## 3. Cupons + mix (US3)
1. Tabela de cupons: código, tipo, usos (usedCount), status; CSV.
2. Mix de **pagamento** (Pix/cartão/boleto) e **recebimento** (entrega/retirada) do período, com contagem + %. Período anterior à coleta → estado vazio + aviso.

## 4. Consistência do agregado (regressão do caminho da venda)
1. Pague um pedido com cupom + categoria X + Pix + retirada → `discountTotal`, `byCategory[X]`, `byPaymentMethod.pix`, `byDeliveryMethod.retirada` sobem no dia.
2. **Cancele** esse pedido → os mesmos agregados **revertem**; a Visão geral segue consistente.

## Gates
- `npm run test` verde (orderService: aplica/reverte os novos agregados + item com categoria; util report: sumPeriod/periodKpis/unitsByCategory/mixDistribution); `npm run lint`; `npm run build`.
- Regressão: Visão geral, relatórios/CSV atuais, checkout/pedidos intactos.

## Nota
- Faturamento por categoria, descontos e mix são **forward-only** (a partir do deploy). Unidades por categoria, KPIs, gráfico e cupons são retroativos.
