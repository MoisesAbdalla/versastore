import { useMemo, useRef, useState } from "react";

import { formatBRL } from "../../utils/format";
import styles from "./styles.module.css";

// Gráfico de vendas por dia — SVG próprio, sem lib (research R-10).
// Série única: sem legenda (o título da seção nomeia a série); linha 2px na
// cor validada pelo validador da skill de dataviz (#A87420 — croma e
// contraste OK sobre branco); grid recessivo; hover com crosshair + tooltip;
// tabela oculta para leitores de tela.

const WIDTH = 720;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

const compactBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
});

function shortDate(key) {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

// Teto "redondo" para o eixo Y.
function niceMax(value) {
  if (value <= 0) {
    return 100;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return nice * magnitude;
}

function SalesChart({ series }) {
  const wrapperRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const { points, yTicks, xTicks } = useMemo(() => {
    const max = niceMax(Math.max(...series.map((d) => d.revenue), 0));

    const pts = series.map((d, i) => ({
      ...d,
      x: PAD.left + (series.length === 1 ? plotWidth / 2 : (i / (series.length - 1)) * plotWidth),
      y: PAD.top + plotHeight - (d.revenue / max) * plotHeight,
    }));

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      value: max * f,
      y: PAD.top + plotHeight - f * plotHeight,
    }));

    // ~5 rótulos de data, sempre incluindo as pontas.
    const step = Math.max(1, Math.ceil(series.length / 5));
    const xs = pts.filter((_, i) => i % step === 0 || i === series.length - 1);

    return { points: pts, yMax: max, yTicks: ticks, xTicks: xs };
  }, [series, plotWidth, plotHeight]);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].x},${PAD.top + plotHeight} L${points[0].x},${PAD.top + plotHeight} Z`
    : "";

  function handlePointerMove(event) {
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;

    let nearest = 0;
    let best = Infinity;

    points.forEach((p, i) => {
      const distance = Math.abs(p.x - x);

      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });

    setHoverIndex(nearest);
  }

  const hover = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        role="img"
        aria-label={`Vendas por dia, de ${shortDate(series[0]?.date || "")} a ${shortDate(series[series.length - 1]?.date || "")}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              className={styles.gridLine}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text className={styles.axisLabel} x={PAD.left - 8} y={tick.y + 4} textAnchor="end">
              {compactBRL.format(tick.value / 100)}
            </text>
          </g>
        ))}

        {xTicks.map((p) => (
          <text
            key={p.date}
            className={styles.axisLabel}
            x={p.x}
            y={HEIGHT - 8}
            textAnchor="middle"
          >
            {shortDate(p.date)}
          </text>
        ))}

        {areaPath && <path className={styles.area} d={areaPath} />}
        {linePath && <path className={styles.line} d={linePath} />}

        {hover && (
          <g>
            <line
              className={styles.crosshair}
              x1={hover.x}
              x2={hover.x}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
            />
            <circle className={styles.marker} cx={hover.x} cy={hover.y} r={4} />
          </g>
        )}
      </svg>

      {hover && (
        <div
          className={styles.tooltip}
          style={{ left: `${(hover.x / WIDTH) * 100}%` }}
          role="status"
        >
          <span className={styles.tooltipDate}>{shortDate(hover.date)}</span>
          <span className={styles.tooltipValue}>{formatBRL(hover.revenue)}</span>
          <span className={styles.tooltipMuted}>
            {hover.orderCount} pedido{hover.orderCount === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Vista em tabela para leitores de tela (passo 6 da skill) */}
      <table className={styles.srOnly}>
        <caption>Vendas por dia</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Faturamento</th>
            <th scope="col">Pedidos</th>
          </tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}>
              <td>{shortDate(d.date)}</td>
              <td>{formatBRL(d.revenue)}</td>
              <td>{d.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SalesChart;
