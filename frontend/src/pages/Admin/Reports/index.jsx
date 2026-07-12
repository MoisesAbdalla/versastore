import { useEffect, useMemo, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import DownloadIcon from "@mui/icons-material/Download";

import { getSalesSeries, getTopProducts, periodRange } from "../../../services/dashboardService";
import { listProducts } from "../../../services/productService";
import { dayKey } from "../../../services/orderService";
import { useFeedback } from "../../../contexts/FeedbackContext";
import { exportCsv } from "../../../utils/csv";
import { formatBRL, centsToInput, maskDateInput, parseDateInput } from "../../../utils/format";
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

function ReportsPage() {
  const { toastSuccess } = useFeedback();

  const [presetDays, setPresetDays] = useState(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customApplied, setCustomApplied] = useState(null);
  const [grouping, setGrouping] = useState("dia");

  const [series, setSeries] = useState([]);
  const [products, setProducts] = useState([]);
  const [soldByProduct, setSoldByProduct] = useState(new Map());
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
      getSalesSeries(period.from, period.to),
      // Top "grande" (sem teto de 5) para cruzar com o catálogo.
      getTopProducts(period.from, period.to, 1000),
      // Catálogo com teto de leitura (constituição IV); escala declarada:
      // centenas de produtos.
      listProducts({ pageSize: 200 }),
    ])
      .then(([seriesData, topData, productPage]) => {
        if (cancelled) {
          return;
        }

        setSeries(seriesData);
        setSoldByProduct(new Map(topData.map((item) => [item.productId, item.units])));
        setProducts(productPage.items);
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
