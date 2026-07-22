import { useEffect, useMemo, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import DownloadIcon from "@mui/icons-material/Download";

import { getPeriodReport, getTopProducts, periodRange } from "../../../services/dashboardService";
import { listProducts } from "../../../services/productService";
import { listCoupons } from "../../../services/couponService";
import { dayKey } from "../../../services/orderService";
import { unitsByCategory } from "../../../utils/report";
import { couponStatus } from "../../../utils/coupon";
import { COUPON_TYPE_LABELS, COUPON_STATUS_LABELS } from "../../../constants/coupon";
import { useFeedback } from "../../../contexts/FeedbackContext";
import { exportCsv } from "../../../utils/csv";
import { formatBRL, centsToInput, maskDateInput, parseDateInput } from "../../../utils/format";
import StatCard from "../../../components/StatCard";
import SalesChart from "../../../components/SalesChart";
import styles from "./styles.module.css";

const PERIOD_PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

const GROUPINGS = [
  { value: "dia", label: "Por dia" },
  { value: "semana", label: "Por semana" },
  { value: "mes", label: "Por mês" },
];

const PAYMENT_LABELS = { pix: "Pix", cartao: "Cartão", boleto: "Boleto" };
const DELIVERY_LABELS = { entrega: "Entrega", retirada: "Retirada na loja" };

function keyToDate(key) {
  return new Date(`${key}T12:00:00-03:00`);
}

function shortDate(key) {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

// Agrupa a série diária por dia/semana (segunda-feira) ou mês — client-side,
// sobre os mesmos dailyStats (FR-070).
function groupSeries(series, grouping) {
  if (grouping === "dia") {
    return series.map((d) => ({ label: shortDate(d.date), ...d }));
  }

  const groups = new Map();

  for (const point of series) {
    let groupKey;
    let label;

    if (grouping === "semana") {
      const date = keyToDate(point.date);
      const weekday = (date.getDay() + 6) % 7; // segunda = 0

      date.setDate(date.getDate() - weekday);
      groupKey = dayKey(date);
      label = `Semana de ${shortDate(groupKey)}`;
    } else {
      groupKey = point.date.slice(0, 7);
      label = `${point.date.slice(5, 7)}/${point.date.slice(0, 4)}`;
    }

    const current = groups.get(groupKey) || { label, revenue: 0, orderCount: 0 };

    current.revenue += point.revenue;
    current.orderCount += point.orderCount;
    groups.set(groupKey, current);
  }

  return [...groups.values()];
}

// Mini-resumo de distribuição (mix) por forma de pagamento/recebimento.
function MixBlock({ title, rows, labels, emptyNote }) {
  if (rows.length === 0) {
    return (
      <div className={styles.mixCard}>
        <h3 className={styles.mixTitle}>{title}</h3>
        <p className={styles.muted}>{emptyNote}</p>
      </div>
    );
  }

  return (
    <div className={styles.mixCard}>
      <h3 className={styles.mixTitle}>{title}</h3>
      <ul className={styles.mixList}>
        {rows.map((row) => (
          <li key={row.key}>
            <span>{labels[row.key] || row.key}</span>
            <span className={styles.mixValue}>
              {row.count} · {Math.round(row.pct)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportsPage() {
  const { toastSuccess } = useFeedback();

  const [presetDays, setPresetDays] = useState(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customApplied, setCustomApplied] = useState(null);
  const [grouping, setGrouping] = useState("dia");

  const [report, setReport] = useState(null);
  const [products, setProducts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const period = useMemo(
    () => customApplied || periodRange(presetDays),
    [presetDays, customApplied]
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      getPeriodReport(period.from, period.to),
      getTopProducts(period.from, period.to, 1000),
      listProducts({ pageSize: 200 }),
      listCoupons().catch(() => []),
    ])
      .then(([reportData, topData, productPage, couponList]) => {
        if (cancelled) {
          return;
        }

        setReport(reportData);
        setTopProducts(topData);
        setProducts(productPage.items);
        setCoupons(couponList);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period.from, period.to]);

  const series = useMemo(() => report?.series ?? [], [report]);
  const soldByProduct = useMemo(
    () => new Map(topProducts.map((item) => [item.productId, item.units])),
    [topProducts]
  );
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const salesRows = useMemo(() => groupSeries(series, grouping), [series, grouping]);

  const bestSellers = useMemo(
    () =>
      products
        .filter((p) => (soldByProduct.get(p.id) || 0) > 0)
        .map((p) => ({ ...p, sold: soldByProduct.get(p.id) }))
        .sort((a, b) => b.sold - a.sold),
    [products, soldByProduct]
  );

  const withoutSales = useMemo(
    () => products.filter((p) => !soldByProduct.get(p.id)),
    [products, soldByProduct]
  );

  // Categoria: unidades (retroativo, join top×catálogo) + faturamento (forward).
  const categoryRows = useMemo(() => {
    const units = unitsByCategory(topProducts, productsById);
    const revByName = new Map((report?.byCategoryRevenue ?? []).map((c) => [c.name, c.revenue]));

    return units.map((row) => ({
      name: row.name,
      units: row.units,
      revenue: revByName.has(row.name) ? revByName.get(row.name) : null,
    }));
  }, [topProducts, productsById, report]);

  const coverageNote =
    report && (!report.coverageStart || report.coverageStart > period.from)
      ? report.coverageStart
        ? `Descontos, faturamento por categoria e mix disponíveis a partir de ${shortDate(report.coverageStart)}.`
        : "Descontos, faturamento por categoria e mix passam a ser coletados a partir de agora."
      : null;

  function applyCustomPeriod() {
    const from = parseDateInput(customFrom);
    const to = parseDateInput(customTo);

    if (from && to && from <= to) {
      setCustomApplied({ from: dayKey(from), to: dayKey(to) });
    }
  }

  function exportSales() {
    const count = exportCsv({
      headers: ["Período", "Faturamento (R$)", "Pedidos"],
      rows: salesRows.map((row) => [row.label, centsToInput(row.revenue), row.orderCount]),
      filename: `vendas-${period.from}-a-${period.to}.csv`,
    });

    toastSuccess(`CSV exportado (${count} linhas).`);
  }

  function exportProducts(rows, name) {
    const count = exportCsv({
      headers: ["Produto", "SKU", "Unidades vendidas no período", "Estoque atual"],
      rows: rows.map((p) => [p.name, p.sku || "", soldByProduct.get(p.id) || 0, p.totalStock ?? p.stock ?? 0]),
      filename: `${name}-${period.from}-a-${period.to}.csv`,
    });

    toastSuccess(`CSV exportado (${count} linhas).`);
  }

  function exportCategories() {
    const count = exportCsv({
      headers: ["Categoria", "Unidades", "Faturamento (R$)"],
      rows: categoryRows.map((c) => [c.name, c.units, c.revenue != null ? centsToInput(c.revenue) : ""]),
      filename: `categorias-${period.from}-a-${period.to}.csv`,
    });

    toastSuccess(`CSV exportado (${count} linhas).`);
  }

  function exportCoupons() {
    const count = exportCsv({
      headers: ["Código", "Tipo", "Usos", "Status"],
      rows: coupons.map((c) => [
        c.code,
        COUPON_TYPE_LABELS[c.type] || c.type,
        c.usedCount || 0,
        COUPON_STATUS_LABELS[couponStatus(c)],
      ]),
      filename: `cupons-${period.from}-a-${period.to}.csv`,
    });

    toastSuccess(`CSV exportado (${count} linhas).`);
  }

  if (error) {
    return (
      <div className={styles.errorState} role="alert">
        <p>Não foi possível carregar os relatórios. Verifique sua conexão.</p>
        <Button variant="outlined" onClick={() => setCustomApplied({ ...period })}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Relatórios</h1>

      <div className={styles.controls}>
        {PERIOD_PRESETS.map((preset) => (
          <Button
            key={preset.days}
            size="small"
            variant={!customApplied && presetDays === preset.days ? "contained" : "text"}
            onClick={() => {
              setPresetDays(preset.days);
              setCustomApplied(null);
            }}
          >
            {preset.label}
          </Button>
        ))}

        <TextField
          size="small"
          label="De"
          value={customFrom}
          onChange={(e) => setCustomFrom(maskDateInput(e.target.value))}
          placeholder="dd/mm/aaaa"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: "numeric" } }}
          className={styles.dateField}
        />

        <TextField
          size="small"
          label="Até"
          value={customTo}
          onChange={(e) => setCustomTo(maskDateInput(e.target.value))}
          placeholder="dd/mm/aaaa"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: "numeric" } }}
          className={styles.dateField}
        />

        <Button size="small" onClick={applyCustomPeriod}>
          Aplicar
        </Button>
      </div>

      {/* KPIs do período (feature 018) */}
      {loading || !report ? (
        <Skeleton variant="rectangular" height={100} />
      ) : (
        <div className={styles.kpis}>
          <StatCard label="Faturamento" value={formatBRL(report.kpis.revenue)} delta={report.kpis.deltas.revenue} deltaLabel="vs. anterior" />
          <StatCard label="Pedidos" value={report.kpis.orderCount} delta={report.kpis.deltas.orderCount} deltaLabel="vs. anterior" />
          <StatCard label="Unidades" value={report.kpis.unitsSold} delta={report.kpis.deltas.unitsSold} deltaLabel="vs. anterior" />
          <StatCard label="Ticket médio" value={formatBRL(report.kpis.avgTicket)} delta={report.kpis.deltas.avgTicket} deltaLabel="vs. anterior" />
        </div>
      )}

      {coverageNote && <p className={styles.forwardNote}>{coverageNote}</p>}

      {/* Gráfico de tendência (feature 018) */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tendência do período</h2>
        {loading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : series.every((d) => d.revenue === 0) ? (
          <p className={styles.muted}>Nenhuma venda no período selecionado.</p>
        ) : (
          <SalesChart series={series} />
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Vendas no período</h2>

          <div className={styles.cardActions}>
            <TextField
              select
              size="small"
              label="Agrupamento"
              value={grouping}
              onChange={(e) => setGrouping(e.target.value)}
              className={styles.groupField}
            >
              {GROUPINGS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <Button size="small" startIcon={<DownloadIcon />} onClick={exportSales} disabled={loading}>
              Exportar CSV
            </Button>
          </div>
        </div>

        {loading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Período</th>
                  <th className={styles.number}>Faturamento</th>
                  <th className={styles.number}>Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {salesRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className={styles.number}>{formatBRL(row.revenue)}</td>
                    <td className={styles.number}>{row.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Desempenho por categoria (feature 018) */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Por categoria</h2>
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={exportCategories}
            disabled={loading || categoryRows.length === 0}
          >
            Exportar CSV
          </Button>
        </div>

        {loading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : categoryRows.length === 0 ? (
          <p className={styles.muted}>Nenhuma venda no período selecionado.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th className={styles.number}>Unidades</th>
                  <th className={styles.number}>Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td className={styles.number}>{c.units}</td>
                    <td className={styles.number}>{c.revenue != null ? formatBRL(c.revenue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Mix de pagamento e recebimento (feature 018) */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Como os clientes pagam e recebem</h2>
        {loading || !report ? (
          <Skeleton variant="rectangular" height={100} />
        ) : (
          <div className={styles.mixGrid}>
            <MixBlock
              title="Forma de pagamento"
              rows={report.paymentMix}
              labels={PAYMENT_LABELS}
              emptyNote="Sem dados no período (coletado a partir do lançamento desta versão)."
            />
            <MixBlock
              title="Forma de recebimento"
              rows={report.deliveryMix}
              labels={DELIVERY_LABELS}
              emptyNote="Sem dados no período (coletado a partir do lançamento desta versão)."
            />
          </div>
        )}
      </section>

      {/* Cupons (snapshot) (feature 018) */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Cupons</h2>
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={exportCoupons}
            disabled={loading || coupons.length === 0}
          >
            Exportar CSV
          </Button>
        </div>

        {loading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : coupons.length === 0 ? (
          <p className={styles.muted}>Nenhum cupom cadastrado.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th className={styles.number}>Usos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code}>
                    <td>{c.code}</td>
                    <td>{COUPON_TYPE_LABELS[c.type] || c.type}</td>
                    <td className={styles.number}>{c.usedCount || 0}</td>
                    <td>{COUPON_STATUS_LABELS[couponStatus(c)]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Mais vendidos no período</h2>

          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => exportProducts(bestSellers, "mais-vendidos")}
            disabled={loading || bestSellers.length === 0}
          >
            Exportar CSV
          </Button>
        </div>

        {loading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : bestSellers.length === 0 ? (
          <p className={styles.muted}>Nenhuma venda no período selecionado.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className={styles.number}>Unidades vendidas</th>
                  <th className={styles.number}>Estoque atual</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.slice(0, 20).map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td className={styles.number}>{product.sold}</td>
                    <td className={styles.number}>{product.totalStock ?? product.stock ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Sem vendas no período</h2>

          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => exportProducts(withoutSales, "sem-vendas")}
            disabled={loading || withoutSales.length === 0}
          >
            Exportar CSV
          </Button>
        </div>

        {loading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : withoutSales.length === 0 ? (
          <p className={styles.muted}>Todos os produtos venderam no período. 🎉</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className={styles.number}>Estoque atual</th>
                </tr>
              </thead>
              <tbody>
                {withoutSales.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td className={styles.number}>{product.totalStock ?? product.stock ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default ReportsPage;
