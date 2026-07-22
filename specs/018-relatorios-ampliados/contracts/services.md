# Contracts — Serviços & Utilitários (018)

## `services/orderService.js` (ALTERADO)

```js
// createOrder: cada item congelado ganha categoryId/categoryName (product já lido).
frozenItems.push({ ...atuais, categoryId: product.categoryId || null,
                   categoryName: product.categoryName || product.category || "" });

// emptyStats(): + discountTotal:0, byCategory:{}, byPaymentMethod:{}, byDeliveryMethod:{}

// applyStatsDelta(stats, order, direction): além do atual, aplica ±direction:
//  - discountTotal += direction * (order.discount || 0)   (Math.max(0, …))
//  - byCategory[cat] { revenue += dir*unitPrice*qty, units += dir*qty }  (remove ao zerar)
//  - byPaymentMethod[order.paymentMethod] += direction    (remove ao zerar)
//  - byDeliveryMethod[order.deliveryMethod || "entrega"] += direction
// Mesmo ponto (transição pago aplica +1; cancelamento/devolução aplica -1).
```

Sem mudança de assinatura pública; `advanceStatus`/`restockAndClose` já chamam `applyStatsDelta`.

## `utils/report.js` (NOVO — puro, testável)

```js
// Soma os agregados de um mapa dia→stats no intervalo [from,to].
export function sumPeriod(byDay, fromKey, toKey):
  { revenue, orderCount, unitsSold, discountTotal,
    byCategory:{id:{name,revenue,units}}, byPaymentMethod:{}, byDeliveryMethod:{} }

// Ticket médio + variação % vs. período anterior (null se sem base).
export function periodKpis(current, previous):
  { revenue, orderCount, unitsSold, discountTotal, avgTicket, deltas:{...} }

// Unidades por categoria (retroativo): top (productId→units) × catálogo.
export function unitsByCategory(topProducts, productsById):
  [{ categoryId, name, units }]  // ordenado desc; "sem-categoria" agrupa os sem categoria

// Distribuição (contagem + %) de um map de contagens.
export function mixDistribution(counts): [{ key, count, pct }]
```

## `services/dashboardService.js` (ALTERADO)

```js
// Relatório do período: 1 range em dailyStats cobre período + comparação
// (estende o from para trás uma duração). Reusa getStatsRange.
export async function getPeriodReport(fromKey, toKey):
  { kpis,                    // periodKpis(atual, anterior)
    series,                  // [{date,revenue,orderCount}] (para o gráfico)
    byCategoryRevenue,       // [{name,revenue,units}] do byCategory novo (forward)
    paymentMix, deliveryMix, // mixDistribution
    coverageStart }          // 1º dia do range com campos novos, ou null (aviso forward-only)
```

`getSalesSeries`/`getTopProducts`/`getOverviewStats` inalterados (Visão geral intacta).

## Página `pages/Admin/Reports/index.jsx` (ALTERADO)

- Usa `getPeriodReport` para KPIs, gráfico, mix e faturamento por categoria.
- Une com `getTopProducts` + `listProducts` (já carregados) para **unidades por categoria** (retroativo) e mantém "Mais vendidos"/"Sem vendas".
- `listCoupons` (013) para a tabela de cupons (snapshot).
- CSV (via `exportCsv`) para categoria e cupons, além dos existentes.

## Testes (Princípio II — toca a venda)

- `services/__tests__/orderService.test.js` (estender): pagar um pedido acumula `discountTotal`/`byCategory`/`byPaymentMethod`/`byDeliveryMethod`; cancelar/devolver reverte; item congela `categoryId`/`categoryName`.
- `utils/__tests__/report.test.js`: `sumPeriod` (soma novos campos), `periodKpis` (ticket médio + deltas, base ausente → null), `unitsByCategory` (join + "sem-categoria"), `mixDistribution` (contagem+%).
