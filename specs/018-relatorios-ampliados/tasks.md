# Tasks: Relatórios Ampliados do Admin (018)

**Input**: Design documents from `/specs/018-relatorios-ampliados/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.md, contracts/ui.md, quickstart.md, research.md

**Tests**: INCLUÍDOS — a extensão toca o **caminho da venda** (Princípio II): `applyStatsDelta` aplica no `pago` e reverte no cancelamento; cálculos de período/categoria/mix.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: a extensão do agregado + o util de relatório bloqueiam a UI

- [x] T001 Estender `frontend/src/services/orderService.js`: (a) `createOrder` grava `categoryId`/`categoryName` em cada item congelado; (b) `emptyStats()` inclui `discountTotal:0, byCategory:{}, byPaymentMethod:{}, byDeliveryMethod:{}`; (c) `applyStatsDelta` aplica ±direction em `discountTotal` (order.discount), `byCategory[cat]{revenue,units}` (dos itens), `byPaymentMethod[paymentMethod]`, `byDeliveryMethod[deliveryMethod||"entrega"]`, removendo entradas ao zerar — estender `frontend/src/services/__tests__/orderService.test.js` (pagar acumula os 4 novos; cancelar/devolver reverte; item tem categoryId/categoryName; pedido legado sem categoria → "sem-categoria")
- [x] T002 [P] Criar `frontend/src/utils/report.js` (contracts/services.md): `sumPeriod`, `periodKpis` (ticket médio + deltas; base ausente → null), `unitsByCategory` (join top×catálogo, "sem-categoria"), `mixDistribution` (contagem+%) — testes em `frontend/src/utils/__tests__/report.test.js`
- [x] T003 Estender `frontend/src/services/dashboardService.js`: `getPeriodReport(from,to)` — 1 range em dailyStats cobrindo período + período anterior; retorna `kpis`, `series`, `byCategoryRevenue`, `paymentMix`, `deliveryMix`, `coverageStart`. Não altera getOverviewStats/getSalesSeries/getTopProducts

**Checkpoint**: agregado estendido (aplica/reverte testado) + cálculo de período pronto

---

## Phase 2: User Story 1 - KPIs + gráfico (Priority: P1) 🎯 MVP

- [x] T004 [US1] Na `frontend/src/pages/Admin/Reports/index.jsx`, adicionar o bloco de **KPIs** (faturamento, pedidos, unidades, ticket médio + delta % vs. período anterior via `getPeriodReport`) no topo; "—" sem base; skeleton/erro/vazio
- [x] T005 [US1] Adicionar o **gráfico de tendência** (reusar `SalesChart` com a série do período) abaixo dos KPIs; estado vazio sem vendas

**Checkpoint**: leitura executiva do período com comparação e tendência

---

## Phase 3: User Story 2 - Desempenho por categoria (Priority: P1)

- [x] T006 [US2] Bloco **por categoria** na Reports: unidades (retroativo, `unitsByCategory` com top+catálogo já carregados) + faturamento (forward, `byCategoryRevenue`), ordenado desc, "Sem categoria", aviso forward-only quando o período começa antes de `coverageStart`; **CSV** via `exportCsv`

**Checkpoint**: visão de portfólio por categoria com CSV

---

## Phase 4: User Story 3 - Cupons + mix (Priority: P2)

- [x] T007 [US3] Bloco **cupons** na Reports: `listCoupons` (013) → código, tipo, usos, status (`couponStatus`); **CSV**; estado vazio
- [x] T008 [US3] Bloco **mix** de pagamento (Pix/cartão/boleto) e recebimento (entrega/retirada) via `paymentMix`/`deliveryMix` (contagem + %); estado vazio + aviso forward-only para períodos anteriores à coleta

**Checkpoint**: marketing (cupons) e operacional (mix) visíveis

---

## Phase 5: Polish & Cross-Cutting

- [x] T009 [P] Atualizar `docs/design-system.md` com a seção **Relatórios ampliados** (KPIs com delta, gráfico, categoria, mix, cupons; nota de forward-only)
- [x] T010 Gates finais: `npm run lint`, `npm run test`, `npm run build`
- [ ] T011 Regressão do quickstart (§1–4) — **validação manual do usuário** (inclui pagar/cancelar um pedido e conferir os agregados)

---

## Dependencies & Execution Order

- **Foundational (T001–T003)** bloqueia a UI. T001 (agregado) e T002 (util) em paralelo; T003 depois de T002.
- **US1 (T004/T005)** depois de T003. **US2 (T006)** depois de T002/T003. **US3 (T007/T008)** depois de T003 (T007 só precisa de listCoupons).
- **Polish** depois das stories.

## Notes
- **Sem rules/índices/coleção novos**. Extensão do `dailyStats` é **forward-only**; unidades por categoria/KPIs/gráfico/cupons são retroativos.
- **Constituição IV**: só `dailyStats` (range por id) + `listProducts`/`listCoupons` com teto — nunca varrer `orders`.
- Reusa `SalesChart`, `exportCsv`, `dashboardService`, utils de data/BRL, `couponStatus` (013).
