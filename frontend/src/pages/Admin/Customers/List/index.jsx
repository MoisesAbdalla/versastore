import { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import DownloadIcon from "@mui/icons-material/Download";

import DataTable from "../../../../components/DataTable";
import { useListState } from "../../../../hooks/useListState";
import { usePagination } from "../../../../hooks/usePagination";
import { useCustomers } from "../../../../hooks/useCustomers";
import { useFeedback } from "../../../../contexts/FeedbackContext";
import { exportCsv, CSV_MAX_ROWS } from "../../../../utils/csv";
import { formatBRL, formatDate, centsToInput } from "../../../../utils/format";
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
  const { toastSuccess, toastError } = useFeedback();

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

  async function handleExport() {
    try {
      const { items } = await fetchCustomers({
        search: state.search,
        sort: { key: state.sortKey, direction: state.sortDir },
        pageSize: CSV_MAX_ROWS,
      });

      const count = exportCsv({
        headers: ["Nome", "E-mail", "Cadastro", "Pedidos", "Total gasto (R$)"],
        rows: items.map((c) => [
          c.name || "",
          c.email || "",
          formatDate(c.createdAt),
          c.orderCount || 0,
          centsToInput(c.totalSpent || 0),
        ]),
        filename: `clientes-${new Date().toISOString().slice(0, 10)}.csv`,
      });

      toastSuccess(`CSV exportado (${count} linhas).`);
    } catch {
      toastError("Erro ao exportar. Verifique sua conexão.");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Clientes</h1>

        <Button size="small" startIcon={<DownloadIcon />} onClick={handleExport}>
          Exportar CSV
        </Button>
      </div>

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
