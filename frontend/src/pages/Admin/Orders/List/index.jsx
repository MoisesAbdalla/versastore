import { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";

import DataTable from "../../../../components/DataTable";
import { useListState } from "../../../../hooks/useListState";
import { usePagination } from "../../../../hooks/usePagination";
import { useOrders } from "../../../../hooks/useOrders";
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
} from "../../../../constants/orderStatus";
import { formatOrderNumber } from "../../../../services/orderService";
import { formatBRL, formatDate, maskDateInput, parseDateInput } from "../../../../utils/format";
import ROUTES from "../../../../constants/routes";
import styles from "./styles.module.css";

const LIST_DEFAULTS = {
  search: "",
  status: "",
  from: "",
  to: "",
  after: null,
  page: null,
};

const STATUS_CHIP_COLORS = {
  [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: "warning",
  [ORDER_STATUS.PAGO]: "info",
  [ORDER_STATUS.EM_SEPARACAO]: "info",
  [ORDER_STATUS.ENVIADO]: "primary",
  [ORDER_STATUS.ENTREGUE]: "success",
  [ORDER_STATUS.CANCELADO]: "error",
  [ORDER_STATUS.DEVOLVIDO]: "default",
};

const PAYMENT_LABELS = { pix: "Pix", cartao: "Cartão", boleto: "Boleto" };

export function OrderStatusChip({ status }) {
  return (
    <Chip
      size="small"
      label={ORDER_STATUS_LABELS[status] || status}
      color={STATUS_CHIP_COLORS[status] || "default"}
      variant="outlined"
    />
  );
}

function OrderListPage() {
  const navigate = useNavigate();
  const { state, setFilters } = useListState(LIST_DEFAULTS);
  const { fetchOrders } = useOrders();

  const initialAfterRef = useRef(state.after);

  const fetchPage = useCallback(
    (cursor) => {
      const effectiveCursor = cursor ?? initialAfterRef.current;
      initialAfterRef.current = null;

      return fetchOrders({
        search: state.search,
        status: state.status,
        dateFrom: parseDateInput(state.from),
        dateTo: parseDateInput(state.to, { endOfDay: true }),
        cursor: effectiveCursor,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchOrders, state.search, state.status, state.from, state.to]
  );

  const pagination = usePagination(fetchPage);

  const columns = useMemo(
    () => [
      { key: "orderNumber", label: "Pedido", render: (row) => formatOrderNumber(row.orderNumber) },
      { key: "customerName", label: "Cliente", render: (row) => row.customerName || row.customerEmail },
      { key: "createdAt", label: "Data", render: (row) => formatDate(row.createdAt) },
      {
        key: "items",
        label: "Itens",
        render: (row) => row.items.reduce((sum, item) => sum + item.quantity, 0),
      },
      { key: "total", label: "Total", render: (row) => formatBRL(row.total) },
      {
        key: "paymentMethod",
        label: "Pagamento",
        render: (row) => PAYMENT_LABELS[row.paymentMethod] || row.paymentMethod || "—",
      },
      { key: "status", label: "Status", render: (row) => <OrderStatusChip status={row.status} /> },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Pedidos</h1>

      <div className={styles.filters}>
        <TextField
          size="small"
          label="Buscar por nº do pedido ou cliente"
          defaultValue={state.search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setFilters({ search: e.target.value, status: "", from: "", to: "" });
            }
          }}
          className={styles.searchField}
          helperText="Nº exato (ex.: #000123) ou início do nome (Enter aplica)"
        />

        <TextField
          select
          size="small"
          label="Status"
          value={state.status}
          onChange={(e) => setFilters({ status: e.target.value, search: "" })}
          className={styles.selectField}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.values(ORDER_STATUS).map((status) => (
            <MenuItem key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          label="De"
          value={state.from}
          onChange={(e) => setFilters({ from: maskDateInput(e.target.value), search: "" })}
          placeholder="dd/mm/aaaa"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: "numeric" } }}
          className={styles.dateField}
        />

        <TextField
          size="small"
          label="Até"
          value={state.to}
          onChange={(e) => setFilters({ to: maskDateInput(e.target.value), search: "" })}
          placeholder="dd/mm/aaaa"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: "numeric" } }}
          className={styles.dateField}
        />
      </div>

      <DataTable
        columns={columns}
        rows={pagination.items}
        loading={pagination.loading}
        error={pagination.error}
        onRetry={pagination.refresh}
        onRowClick={(row) => navigate(`${ROUTES.ADMIN_ORDERS}/${row.id}`)}
        pagination={pagination}
        emptyState={{
          title: "Nenhum pedido encontrado",
          description:
            state.search || state.status || state.from || state.to
              ? "Ajuste a busca ou os filtros para encontrar o pedido."
              : "Os pedidos da loja aparecerão aqui assim que forem realizados.",
        }}
      />
    </div>
  );
}

export default OrderListPage;
