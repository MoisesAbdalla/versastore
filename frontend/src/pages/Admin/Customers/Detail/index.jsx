import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import DataTable from "../../../../components/DataTable";
import EmptyState from "../../../../components/EmptyState";
import { OrderStatusChip } from "../../Orders/List";
import { usePagination } from "../../../../hooks/usePagination";
import { useCustomers } from "../../../../hooks/useCustomers";
import { formatOrderNumber } from "../../../../services/orderService";
import { formatBRL, formatDate } from "../../../../utils/format";
import ROUTES from "../../../../constants/routes";
import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";

function addressLine(address) {
  return [
    [address.rua, address.numero].filter(Boolean).join(", "),
    address.complemento,
    address.bairro,
    [address.cidade, address.uf].filter(Boolean).join(" - "),
    address.cep,
  ]
    .filter(Boolean)
    .join(" · ");
}

const ORDER_COLUMNS = [
  { key: "orderNumber", label: "Pedido", render: (row) => formatOrderNumber(row.orderNumber) },
  { key: "createdAt", label: "Data", render: (row) => formatDate(row.createdAt) },
  { key: "total", label: "Total", render: (row) => formatBRL(row.total) },
  { key: "status", label: "Status", render: (row) => <OrderStatusChip status={row.status} /> },
];

function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchCustomer, fetchCustomerOrders } = useCustomers();

  const [customer, setCustomer] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchCustomer(id)
      .then(setCustomer)
      .finally(() => setLoaded(true));
  }, [fetchCustomer, id]);

  const fetchPage = useCallback(
    (cursor) => fetchCustomerOrders(id, { cursor }),
    [fetchCustomerOrders, id]
  );

  const pagination = usePagination(fetchPage);

  if (!loaded) {
    return <p className={styles.loading}>Carregando…</p>;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Cliente não encontrado"
        actionLabel="Voltar aos clientes"
        actionTo={ROUTES.ADMIN_CUSTOMERS}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.backLink} to={ROUTES.ADMIN_CUSTOMERS}>
          <ArrowBackIcon fontSize="small" /> Clientes
        </Link>

        <h1 className={styles.title}>{customer.name || customer.email}</h1>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Dados do cliente</h2>

          <dl className={styles.dataList}>
            <div className={styles.dataRow}>
              <dt>Nome</dt>
              <dd>{customer.name || "—"}</dd>
            </div>
            <div className={styles.dataRow}>
              <dt>E-mail</dt>
              <dd>{customer.email}</dd>
            </div>
            <div className={styles.dataRow}>
              <dt>Cadastro</dt>
              <dd>{formatDate(customer.createdAt)}</dd>
            </div>
            <div className={styles.dataRow}>
              <dt>Pedidos</dt>
              <dd>{customer.orderCount || 0}</dd>
            </div>
            <div className={styles.dataRow}>
              <dt>Total gasto</dt>
              <dd>{formatBRL(customer.totalSpent || 0)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Endereços</h2>

          {(customer.addresses || []).length === 0 ? (
            <p className={styles.muted}>Nenhum endereço cadastrado.</p>
          ) : (
            <ul className={styles.addressList}>
              {customer.addresses.map((address, index) => (
                <li key={index} className={styles.addressItem}>
                  {addressLine(address)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Histórico de pedidos</h2>

        <DataTable
          columns={ORDER_COLUMNS}
          rows={pagination.items}
          loading={pagination.loading}
          error={pagination.error}
          onRetry={pagination.refresh}
          onRowClick={(row) => navigate(`${ROUTES.ADMIN_ORDERS}/${row.id}`)}
          pagination={pagination}
          emptyState={{
            title: "Nenhum pedido deste cliente",
            description: "Os pedidos deste cliente aparecerão aqui.",
          }}
        />
      </section>
    </div>
  );
}

export default CustomerDetailPage;
