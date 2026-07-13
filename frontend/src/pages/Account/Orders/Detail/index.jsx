import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../../contexts/AuthContext";
import { getMyOrder, formatOrderNumber } from "../../../../services/orderService";
import { ORDER_STATUS_LABELS } from "../../../../constants/orderStatus";
import { formatBRL, formatDateTime } from "../../../../utils/format";
import ROUTES from "../../../../constants/routes";
import styles from "./styles.module.css";

// Detalhe de "Meus pedidos" (feature 007, US4). Carrega via getMyOrder, que
// devolve null se o pedido não for do usuário (SC-006) — cai no "não
// encontrado", sem vazar pedido alheio.
function AccountOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user?.uid) {
      return undefined;
    }

    setLoading(true);
    setError(false);

    getMyOrder(id, user.uid)
      .then((result) => {
        if (active) {
          setOrder(result);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, user?.uid]);

  if (loading) {
    return <p className={styles.muted}>Carregando o pedido…</p>;
  }

  if (error) {
    return <p className={styles.muted}>Não foi possível carregar o pedido. Tente novamente.</p>;
  }

  if (!order) {
    return (
      <div className={styles.notFound}>
        <p>Pedido não encontrado.</p>
        <Link to={ROUTES.CONTA_PEDIDOS} className={styles.back}>
          Voltar para meus pedidos
        </Link>
      </div>
    );
  }

  const address = order.shippingAddress;

  return (
    <div className={styles.wrap}>
      <Link to={ROUTES.CONTA_PEDIDOS} className={styles.back}>
        ← Voltar para meus pedidos
      </Link>

      <header className={styles.header}>
        <h2 className={styles.title}>Pedido {formatOrderNumber(order.orderNumber)}</h2>
        <span className={styles.status} data-status={order.status}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </span>
      </header>

      <p className={styles.date}>Feito em {formatDateTime(order.createdAt)}</p>

      {order.trackingCode && (
        <p className={styles.tracking}>
          Código de rastreio: <strong>{order.trackingCode}</strong>
        </p>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Itens</h3>

        <ul className={styles.items}>
          {order.items.map((item, index) => (
            <li key={`${item.productId}-${item.variationId || "base"}-${index}`} className={styles.item}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{item.name}</span>
                {item.variationLabel && (
                  <span className={styles.itemVariation}>{item.variationLabel}</span>
                )}
                <span className={styles.itemQty}>
                  {item.quantity} × {formatBRL(item.unitPrice)}
                </span>
              </div>
              <span className={styles.itemTotal}>{formatBRL(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className={styles.totalRow}>
          <span>Total</span>
          <strong>{formatBRL(order.total)}</strong>
        </div>
      </section>

      {address && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Endereço de entrega</h3>
          <address className={styles.address}>
            {address.street}, {address.number}
            {address.complement ? ` — ${address.complement}` : ""}
            <br />
            {address.neighborhood} — {address.city}/{address.state}
            <br />
            CEP {address.cep}
          </address>
        </section>
      )}
    </div>
  );
}

export default AccountOrderDetail;
