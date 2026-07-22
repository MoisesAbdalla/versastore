# Implementation Plan: Relatórios Ampliados do Admin (018)

**Branch**: `018-relatorios-ampliados` | **Date**: 2026-07-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-relatorios-ampliados/spec.md`

## Summary

Ampliar a página **/admin/reports** com: (1) **KPIs do período** (faturamento, pedidos, unidades, ticket médio) + variação % vs. o período anterior de mesma duração; (2) **gráfico de tendência** reusando o `SalesChart`; (3) **desempenho por categoria** (unidades retroativas do `unitsByProduct` × catálogo; faturamento forward-only do agregado novo) + CSV; (4) **snapshot de cupons** (usos + status) + CSV; (5) **mix de forma de pagamento e de recebimento** do período (agregado novo). A base client-only cobre KPIs/gráfico/categoria-unidades/cupons de forma **retroativa**; uma **extensão modesta e forward-only do `dailyStats`** (escrita no `pago`, revertida no cancelamento/devolução — padrão opção C) acrescenta `discountTotal`, `byCategory{revenue,units}`, `byPaymentMethod` e `byDeliveryMethod`. Regra de ouro (Constituição IV): só `dailyStats` (range por id) + consultas com `limit` — **nunca varrer `orders`**.

## Technical Context

**Language/Version**: JavaScript (ES Modules), React 19.2 + Vite 8 — sem TypeScript.

**Primary Dependencies**: Firebase SDK 12 (Firestore, `runTransaction`), MUI 9 (admin), o `SalesChart` existente, `exportCsv`, utils de data/BRL. Sem dependência nova.

**Storage**: Firestore — **campos novos no doc `dailyStats/{dia}`** (sem coleção nova); **itens congelados do pedido** ganham `categoryId`/`categoryName`. Sem mudança de rules/índices (`dailyStats` já é admin; range por id de documento não exige índice composto).

**Testing**: Vitest 4 + RTL. A extensão toca o **caminho da venda** (Princípio II) → testar `applyStatsDelta` ampliado (aplica no `pago`, reverte no cancelamento/devolução) e os cálculos de período/categoria/deltas.

**Target Platform**: Web (painel admin), responsivo.

**Project Type**: Web app single-frontend, sem backend.

**Performance Goals**: leitura = 1 range em `dailyStats` (como hoje) + `listProducts`/`listCoupons` com teto; sem N+1; sem leitura extra na transação do `pago` (categoria vem dos itens congelados).

**Constraints**: **nunca varrer `orders`** (Constituição IV); extensão do agregado **forward-only** (dias antigos sem os campos → tratados como 0, com aviso); não quebrar a Visão geral (lê os mesmos agregados) nem os relatórios/CSV atuais.

**Scale/Scope**: centenas de produtos; período/catálogo pequenos-médios; poucas categorias.

## Constitution Check

- **I. Code Quality** — PASS. Cálculo de período/categoria/deltas em funções puras no `dashboardService`/util; `applyStatsDelta` estendido num único ponto; página Reports componível (blocos), sem duplicar lógica de agregação.
- **II. Testing Standards** — PASS (obrigatório: toca a venda). Testar o `applyStatsDelta` ampliado (discount/categoria/pagamento/entrega aplicam no `pago` e revertem no cancelamento), os KPIs/deltas do período e a agregação por categoria. Não toca estoque/auth.
- **III. UX Consistency** — PASS. KPIs/gráfico/tabelas nos tokens e no padrão do admin (cards, DataTable/tabela atual); estados carregando/erro/vazio; aviso de forward-only; `docs/design-system.md` atualizado.
- **IV. Performance** — PASS. Só `dailyStats` (range por id) + consultas com `limit`; nenhuma varredura de `orders`; sem leitura extra no `pago`; admin já é code-split.

Sem violações → Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/018-relatorios-ampliados/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── services.md   # dailyStats estendido (applyStatsDelta), dashboardService (getPeriodReport), util de relatório
│   └── ui.md         # KPIs, gráfico, categoria, cupons, mix — na página Reports
└── checklists/requirements.md
```

### Source Code (repository root)

```text
frontend/src/
├── services/
│   ├── orderService.js                 # createOrder: itens congelados ganham categoryId/categoryName;
│   │                                   #   applyStatsDelta: + discountTotal, byCategory, byPaymentMethod, byDeliveryMethod
│   │                                   #   emptyStats: novos campos zerados
│   └── dashboardService.js             # + getPeriodReport(from,to): totais + deltas (período anterior) +
│                                       #   byCategoryRevenue/byPayment/byDelivery (novos, forward) + coverageStart
├── utils/
│   ├── report.js                       # NOVO — puros: sumPeriod, periodDelta, mergeByCategory/units, mixFrom
│   └── __tests__/report.test.js
├── pages/Admin/Reports/index.jsx       # KPIs (cards + delta), gráfico (SalesChart), categoria (unidades+faturamento),
│                                       #   cupons (listCoupons), mix pagamento/entrega; mantém vendas/mais vendidos/sem vendas + CSV
└── (SalesChart, exportCsv, format)     # reutilizados
firestore.rules / firestore.indexes.json # SEM mudança
```

**Structure Decision**: single-frontend. A extensão do agregado é **aditiva** ao `dailyStats` e ao `applyStatsDelta` (um único ponto, já dentro da transação `pago`/cancelamento); os itens congelados guardam a categoria na criação (o produto já é lido lá), evitando leitura extra no `pago`. Os relatórios leem tudo do range de `dailyStats` + `listProducts`/`listCoupons` com teto. **Sem** rules/índices novos; **sem** coleção nova.

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
