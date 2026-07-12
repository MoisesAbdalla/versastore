import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import ConfirmDialog from "../../../../components/ConfirmDialog";
import EmptyState from "../../../../components/EmptyState";
import { OrderStatusChip } from "../List";
import { getOrder, formatOrderNumber } from "../../../../services/orderService";
import { useOrders } from "../../../../hooks/useOrders";
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
} from "../../../../constants/orderStatus";
import { formatBRL, formatDateTime } from "../../../../utils/format";
import ROUTES from "../../../../constants/routes";
import styles from "./styles.module.css";

function addressLine(address) {
  if (!address) {
    return "—";
  }

  const parts = [
    [address.rua, address.numero].filter(Boolean).join(", "),
    address.complemento,
    address.bairro,
    [address.cidade, address.uf].filter(Boolean).join(" - "),
    address.cep,
  ].filter(Boolean);

  return parts.join(" · ");
}

function OrderDetailPage() {
  const { id } = useParams();
  const { advance, cancel, markReturned, saveTracking, saveNotes } = useOrders();

  const [order, setOrder] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(null); // { action: "advance" | "cancel" | "return", next? }
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const data = await getOrder(id);

    setOrder(data);
    setTracking(data?.trackingCode || "");
    setNotes(data?.internalNotes || "");
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    load().catch(() => setLoaded(true));
  }, [load]);

  async function runAction() {
    setActing(true);

    let ok = false;

    if (confirm.action === "advance") {
      ok = await advance(id, confirm.next);
    } else if (confirm.action === "cancel") {
      ok = await cancel(id, reason);
    } else if (confirm.action === "return") {
      ok = await markReturned(id, reason);
    }

    setActing(false);

    if (ok) {
      setConfirm(null);
      setReason("");
      await load();
    }
  }

  if (!loaded) {
    return <p className={styles.loading}>Carregando…</p>;
  }

  if (!order) {
    return (
      <EmptyState
        title="Pedido não encontrado"
        actionLabel="Voltar aos pedidos"
        actionTo={ROUTES.ADMIN_ORDERS}
      />
    );
  }

  const nextStatuses = (ORDER_STATUS_TRANSITIONS[order.status] || []).filter(
    (status) => status !== ORDER_STATUS.CANCELADO && status !== ORDER_STATUS.DEVOLVIDO
  );

  const canCancel = (ORDER_STATUS_TRANSITIONS[order.status] || []).includes(ORDER_STATUS.CANCELADO);
  const canReturn = (ORDER_STATUS_TRANSITIONS[order.status] || []).includes(ORDER_STATUS.DEVOLVIDO);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <Link className={styles.backLink} to={ROUTES.ADMIN_ORDERS}>
            <ArrowBackIcon fontSize="small" /> Pedidos
          </Link>

          <h1 className={styles.title}>
            Pedido {formatOrderNumber(order.orderNumber)} <OrderStatusChip status={order.status} />
          </h1>
        </div>

        <div className={styles.actions}>
          {nextStatuses.map((status) => (
            <Button
              key={status}
              variant="contained"
              size="small"
              onClick={() => setConfirm({ action: "advance", next: status, title: `Marcar como "${ORDER_STATUS_LABELS[status]}"`, message: `Avançar o pedido para "${ORDER_STATUS_LABELS[status]}"?` })}
            >
              {ORDER_STATUS_LABELS[status]}
            </Button>
          ))}

          {canReturn && (
            <Button size="small" color="warning" onClick={() => { setReason(""); setConfirm({ action: "return", title: "Registrar devolução", message: "Os itens retornam ao estoque na mesma operação." }); }}>
              Registrar devolução
            </Button>
          )}

          {canCancel && (
            <Button size="small" color="error" onClick={() => { setReason(""); setConfirm({ action: "cancel", title: "Cancelar pedido", message: "O motivo é obrigatório. Os itens retornam ao estoque na mesma operação.", destructive: true }); }}>
              Cancelar pedido
            </Button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Cliente</h2>
          <p className={styles.strong}>{order.customerName || "—"}</p>
          <p className={styles.muted}>{order.customerEmail}</p>

          <h3 className={styles.subTitle}>Endereço de entrega</h3>
          <p className={styles.muted}>{addressLine(order.shippingAddress)}</p>

          <h3 className={styles.subTitle}>Pagamento</h3>
          <p className={styles.muted}>{order.paymentMethod || "—"}</p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Itens (preços do momento da compra)</h2>

          <ul className={styles.itemList}>
            {order.items.map((item, index) => (
              <li key={index} className={styles.item}>
                {item.imageUrl ? (
                  <img className={styles.itemThumb} src={item.imageUrl} alt={item.name} />
                ) : (
                  <span className={styles.itemThumbFallback} aria-hidden="true" />
                )}

                <div className={styles.itemInfo}>
                  <span className={styles.strong}>{item.name}</span>
                  {item.variationLabel && <span className={styles.muted}>{item.variationLabel}</span>}
                  <span className={styles.muted}>
                    {item.quantity} × {formatBRL(item.unitPrice)}
                  </span>
                </div>

                <span className={styles.itemTotal}>{formatBRL(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <p className={styles.total}>Total: {formatBRL(order.total)}</p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Histórico de status</h2>

          <ol className={styles.timeline}>
            {[...(order.statusHistory || [])].reverse().map((entry, index) => (
              <li key={index} className={styles.timelineEntry}>
                <span className={styles.strong}>{ORDER_STATUS_LABELS[entry.status]}</span>
                <span className={styles.muted}>
                  {formatDateTime(entry.at)} · {entry.byName || entry.byUid}
                </span>
                {entry.reason && <span className={styles.reason}>Motivo: {entry.reason}</span>}
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Rastreio e notas</h2>

          <div className={styles.fieldRow}>
            <TextField
              size="small"
              fullWidth
              label="Código de rastreio"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />

            <Button size="small" onClick={() => saveTracking(id, tracking)}>
              Salvar
            </Button>
          </div>

          <div className={styles.fieldRow}>
            <TextField
              size="small"
              fullWidth
              multiline
              rows={3}
              label="Notas internas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button size="small" onClick={() => saveNotes(id, notes)}>
              Salvar
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title || ""}
        message={confirm?.message}
        destructive={confirm?.destructive}
        loading={acting}
        confirmLabel={confirm?.destructive ? "Cancelar pedido" : "Confirmar"}
        onConfirm={runAction}
        onClose={() => setConfirm(null)}
      >
        {(confirm?.action === "cancel" || confirm?.action === "return") && (
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={confirm.action === "cancel" ? "Motivo (obrigatório)" : "Motivo (opcional)"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            margin="dense"
          />
        )}
      </ConfirmDialog>
    </div>
  );
}

export default OrderDetailPage;
