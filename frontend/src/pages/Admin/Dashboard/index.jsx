import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Skeleton from "@mui/material/Skeleton";

import StatCard from "../../../components/StatCard";
import SalesChart from "../../../components/SalesChart";
import { OrderStatusChip } from "../Orders/List";
import { useDashboard } from "../../../hooks/useDashboard";
import { periodRange } from "../../../services/dashboardService";
import { dayKey, formatOrderNumber } from "../../../services/orderService";
import { formatBRL, formatDate, maskDateInput, parseDateInput } from "../../../utils/format";
import ROUTES from "../../../constants/routes";
import styles from "./styles.module.css";

const PERIOD_PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "12 meses", days: 365 },
];

function Dashboard() {
  const [presetDays, setPresetDays] = useState(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customApplied, setCustomApplied] = useState(null);

  const period = useMemo(() => {
    if (customApplied) {
      return customApplied;
    }

    return periodRange(presetDays);
  }, [presetDays, customApplied]);

  const { stats, recentOrders, alerts, series, topProducts, loading, seriesLoading, error, refresh } =
    useDashboard(period);

  function applyCustomPeriod() {
    const from = parseDateInput(customFrom);
    const to = parseDateInput(customTo);

    if (from && to && from <= to) {
      setCustomApplied({ from: dayKey(from), to: dayKey(to) });
    }
  }

  if (error) {
    return (
      <div className={styles.errorState} role="alert">
        <p>Não foi possível carregar a visão geral. Verifique sua conexão.</p>
        <Button variant="outlined" onClick={refresh}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Visão geral</h1>

      <div className={styles.statGrid}>
        {loading || !stats ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={104} />
          ))
        ) : (
          <>
            <StatCard
              label="Faturamento hoje"
              value={formatBRL(stats.today.revenue)}
              delta={stats.today.deltas.revenue}
              deltaLabel="vs. ontem"
            />
            <StatCard
              label="Faturamento 7 dias"
              value={formatBRL(stats.last7Days.revenue)}
              delta={stats.last7Days.deltas.revenue}
              deltaLabel="vs. 7 anteriores"
            />
            <StatCard
              label="Faturamento no mês"
              value={formatBRL(stats.currentMonth.revenue)}
              delta={stats.currentMonth.deltas.revenue}
              deltaLabel="vs. mês passado"
            />
            <StatCard
              label="Pedidos no mês"
              value={String(stats.currentMonth.orderCount)}
              delta={stats.currentMonth.deltas.orderCount}
              deltaLabel="vs. mês passado"
            />
            <StatCard
              label="Ticket médio no mês"
              value={formatBRL(stats.currentMonth.avgTicket)}
              delta={stats.currentMonth.deltas.avgTicket}
              deltaLabel="vs. mês passado"
            />
            <StatCard
              label="Produtos vendidos no mês"
              value={String(stats.currentMonth.unitsSold)}
              delta={stats.currentMonth.deltas.unitsSold}
              deltaLabel="vs. mês passado"
            />
          </>
        )}
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Vendas no período</h2>

          <div className={styles.periodControls}>
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
        </div>

        {seriesLoading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : (
          <SalesChart series={series} />
        )}
      </section>

      <div className={styles.columns}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Mais vendidos no período</h2>

          {topProducts.length === 0 ? (
            <p className={styles.muted}>Nenhuma venda no período selecionado.</p>
          ) : (
            <ol className={styles.topList}>
              {topProducts.map((product) => (
                <li key={product.productId} className={styles.topItem}>
                  <Link
                    className={styles.topLink}
                    to={`${ROUTES.ADMIN_PRODUCTS}/${product.productId}`}
                  >
                    {product.name}
                  </Link>
                  <span className={styles.muted}>{product.units} un.</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Pedidos recentes</h2>

          {recentOrders.length === 0 ? (
            <p className={styles.muted}>Os pedidos da loja aparecerão aqui.</p>
          ) : (
            <ul className={styles.recentList}>
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link className={styles.recentItem} to={`${ROUTES.ADMIN_ORDERS}/${order.id}`}>
                    <span>{formatOrderNumber(order.orderNumber)}</span>
                    <span className={styles.muted}>{formatDate(order.createdAt)}</span>
                    <span>{formatBRL(order.total)}</span>
                    <OrderStatusChip status={order.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {alerts && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Alertas</h2>

          {alerts.outOfStock.length === 0 &&
          alerts.lowStock.length === 0 &&
          alerts.awaitingShipment.length === 0 &&
          alerts.incompleteProducts.length === 0 ? (
            <p className={styles.muted}>Tudo em ordem — nenhum alerta no momento.</p>
          ) : (
            <ul className={styles.alertList}>
              {alerts.outOfStock.map((product) => (
                <li key={`out-${product.id}`} className={styles.alertItem}>
                  <span className={styles.alertBadgeCritical}>Sem estoque</span>
                  <span className={styles.alertText}>{product.name}</span>
                  <Link className={styles.alertAction} to={`${ROUTES.ADMIN_PRODUCTS}/${product.id}`}>
                    Repor
                  </Link>
                </li>
              ))}

              {alerts.lowStock.map((product) => (
                <li key={`low-${product.id}`} className={styles.alertItem}>
                  <span className={styles.alertBadgeWarning}>Estoque baixo</span>
                  <span className={styles.alertText}>
                    {product.name} ({product.totalStock} un.)
                  </span>
                  <Link className={styles.alertAction} to={`${ROUTES.ADMIN_PRODUCTS}/${product.id}`}>
                    Repor
                  </Link>
                </li>
              ))}

              {alerts.awaitingShipment.map((order) => (
                <li key={`ship-${order.id}`} className={styles.alertItem}>
                  <span className={styles.alertBadgeWarning}>Aguardando envio</span>
                  <span className={styles.alertText}>
                    {formatOrderNumber(order.orderNumber)} · {formatDate(order.createdAt)}
                  </span>
                  <Link className={styles.alertAction} to={`${ROUTES.ADMIN_ORDERS}/${order.id}`}>
                    Ver pedido
                  </Link>
                </li>
              ))}

              {alerts.incompleteProducts.map((product) => (
                <li key={`inc-${product.id}`} className={styles.alertItem}>
                  <span className={styles.alertBadgeInfo}>Cadastro incompleto</span>
                  <span className={styles.alertText}>
                    {product.name || "(sem nome)"}
                    {(product.incompleteFields || []).length > 0 && (
                      <span className={styles.alertDetail}>
                        {" — "}
                        {product.incompleteFields.join(", ")}
                      </span>
                    )}
                  </span>
                  <Link className={styles.alertAction} to={`${ROUTES.ADMIN_PRODUCTS}/${product.id}`}>
                    Completar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default Dashboard;
