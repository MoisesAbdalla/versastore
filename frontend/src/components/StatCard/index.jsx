import { formatPct } from "../../utils/format";
import styles from "./styles.module.css";

// Card de indicador (FR-010). O delta usa sinal + cor (nunca cor sozinha);
// null = sem base de comparação no período anterior.
function StatCard({ label, value, delta, deltaLabel }) {
  const deltaClass =
    delta == null ? styles.deltaNeutral : delta >= 0 ? styles.deltaUp : styles.deltaDown;

  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>

      <span className={deltaClass}>
        {formatPct(delta)}
        {deltaLabel && <span className={styles.deltaLabel}> {deltaLabel}</span>}
      </span>
    </div>
  );
}

export default StatCard;
