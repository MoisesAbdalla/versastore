import { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";

import DataTable from "../../../../components/DataTable";
import { useListState } from "../../../../hooks/useListState";
import { usePagination } from "../../../../hooks/usePagination";
import { useCustomers } from "../../../../hooks/useCustomers";
import { formatBRL, formatDate } from "../../../../utils/format";
import ROUTES from "../../../../constants/routes";
import styles from "./styles.module.css";

const LIST_DEFAULTS = {
  search: "",
  sortKey: "createdAt",
  sortDir: "desc",
  after: null,
  page: null,
};

function CustomerListPage() {
  const navigate = useNavigate();
  const { state, setFilters } = useListState(LIST_DEFAULTS);
  const { fetchCustomers } = useCustomers();

  const initialAfterRef = useRef(state.after);

  const fetchPage = useCallback(
    (cursor) => {
      const effectiveCursor = cursor ?? initialAfterRef.current;
      initialAfterRef.current = null;

      return fetchCustomers({
        search: state.search,
        sort: { key: state.sortKey, direction: state.sortDir },
        cursor: effectiveCursor,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchCustomers, state.search, state.sortKey, state.sortDir]
  );

  const pagination = usePagination(fetchPage);

  const columns = useMemo(
    () => [
      {
        key: "nameLower",
        label: "Nome",
        sortable: true,
        render: (row) => row.name || "—",
      },
      { key: "email", label: "E-mail" },
      {
        key: "createdAt",
        label: "Cadastro",
        sortable: true,
        render: (row) => formatDate(row.createdAt),
      },
      { key: "orderCount", label: "Pedidos", render: (row) => row.orderCount || 0 },
      {
        key: "totalSpent",
        label: "Total gasto",
        sortable: true,
        render: (row) => formatBRL(row.totalSpent || 0),
      },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Clientes</h1>

      <TextField
        size="small"
        label="Buscar por nome ou e-mail"
        defaultValue={state.search}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setFilters({ search: e.target.value });
          }
        }}
        className={styles.searchField}
        helperText="Busca por início do nome ou e-mail (Enter aplica)"
      />

      <DataTable
        columns={columns}
        rows={pagination.items}
        loading={pagination.loading}
        error={pagination.error}
        onRetry={pagination.refresh}
        sort={{ key: state.sortKey, direction: state.sortDir }}
        onSortChange={({ key, direction }) => setFilters({ sortKey: key, sortDir: direction })}
        onRowClick={(row) => navigate(`${ROUTES.ADMIN_CUSTOMERS}/${row.id}`)}
        pagination={pagination}
        emptyState={{
          title: "Nenhum cliente encontrado",
          description: state.search
            ? "Ajuste a busca para encontrar o cliente."
            : "Os clientes registrados na loja aparecerão aqui.",
        }}
      />
    </div>
  );
}

export default CustomerListPage;
