# Contracts — UI (018)

Tudo na página **/admin/reports**, acima/entre os blocos atuais, reusando o seletor de período e os tokens do admin.

## Bloco 1 — KPIs do período (topo)

- 4 cartões: **Faturamento**, **Pedidos**, **Unidades**, **Ticket médio**. Cada um: valor do período + **variação %** vs. o período anterior (verde/vermelho; "—" sem base). Opcional: **Descontos concedidos** como 5º cartão (forward-only, aviso).
- Reusa o padrão de card de KPI da Visão geral (mesmo formato de delta).

## Bloco 2 — Gráfico de tendência

- `SalesChart` com a série do período (faturamento e pedidos). Estado vazio se período sem vendas.

## Bloco 3 — Desempenho por categoria

- Tabela: **Categoria** · **Unidades** (retroativo) · **Faturamento** (forward — "—" antes da cobertura). Ordenada por unidades desc; "Sem categoria" agrupa os sem categoria. **CSV**.
- Aviso "Faturamento por categoria a partir de DD/MM" quando o período começa antes da cobertura.

## Bloco 4 — Mix de pagamento e recebimento

- Dois mini-resumos lado a lado: **Forma de pagamento** (Pix/Cartão/Boleto) e **Recebimento** (Entrega/Retirada), cada linha com contagem + %. Forward-only: estado vazio + aviso para períodos anteriores à coleta.

## Bloco 5 — Cupons (snapshot)

- Tabela: **Código** · **Tipo** · **Usos** (usedCount) · **Status** (badge ativo/expirado/esgotado/inativo). **CSV**. Estado vazio "Nenhum cupom cadastrado".

## Blocos existentes (preservados)

- Vendas no período (tabela agrupável) · Mais vendidos · Sem vendas — mantidos, com o mesmo CSV.

## Estados & acessibilidade

- Cada bloco tem carregando (skeleton) / erro (não derruba os outros) / vazio, em pt-BR.
- Avisos de forward-only discretos (texto muted) nos blocos dependentes da extensão.

## Design system

`docs/design-system.md` ganha a seção **Relatórios ampliados** (KPIs com delta, gráfico, categoria, mix, cupons; nota de forward-only).
