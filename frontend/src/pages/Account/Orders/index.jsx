import { Link } from "react-router-dom";
import EmptyState from "../../../components/EmptyState";
import { useAuth } from "../../../contexts/AuthContext";
import { useMyOrders } from "../../../hooks/useMyOrders";
import { formatOrderNumber } from "../../../services/orderService";
import { ORDER_STATUS_LABELS } from "../../../constants/orderStatus";
import { formatBRL, formatDate } from "../../../utils/format";
import ROUTES from "../../../constants/routes";
import styles from "./styles.module.css";

// Aba "Meus pedidos" (feature 007, US4): histórico do próprio cliente com
// estados de carregando / vazio / erro.
function AccountOrders() {
  const { user } = useAuth();
  const { items, loading, loadingMore, error, hasMore, loadMore, refresh } = useMyOrders(user?.uid);

  if (loading) {
    return <p className={styles.muted}>Carregando seus pedidos…</p>;
  }

  if (error) {
    return (
      <div className={styles.errorBox}>
        <p>Não foi possível carregar seus pedidos.</p>
        <button type="button" className={styles.retry} onClick={refresh}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Você ainda não fez pedidos"
        description="Quando você comprar, seus pedidos aparecem aqui para acompanhamento."
        actionLabel="Ver produtos"
        actionTo={ROUTES.PRODUCTS}
      />
    );
  }

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {items.map((order) => (
          <li key={order.id}>
            <Link to={`${ROUTES.CONTA_PEDIDOS}/${order.id}`} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.number}>{formatOrderNumber(order.orderNumber)}</span>
                <span className={styles.date}>{formatDate(order.createdAt)}</span>
              </div>

              <div className={styles.rowMeta}>
                <span className={styles.status} data-status={order.status}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
                <span className={styles.total}>{formatBRL(order.total)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button type="button" className={styles.more} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Carregando…" : "Carregar mais"}
        </button>
      )}
    </div>
  );
}

export default AccountOrders;
