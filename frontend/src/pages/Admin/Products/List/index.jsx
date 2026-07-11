import { useCallback, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import AddIcon from "@mui/icons-material/Add";

import DataTable from "../../../../components/DataTable";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import { useListState } from "../../../../hooks/useListState";
import { usePagination } from "../../../../hooks/usePagination";
import { useProducts } from "../../../../hooks/useProducts";
import { formatBRL, formatDate } from "../../../../utils/format";
import { PRODUCT_STATUS, PRODUCT_STATUS_LABELS } from "../../../../constants/product";
import ROUTES from "../../../../constants/routes";
import styles from "./styles.module.css";

const LIST_DEFAULTS = {
  search: "",
  status: "",
  stockRange: "",
  sortKey: "createdAt",
  sortDir: "desc",
  after: null,
  page: null,
};

const STATUS_CHIP_COLORS = {
  [PRODUCT_STATUS.ATIVO]: "success",
  [PRODUCT_STATUS.INATIVO]: "default",
  [PRODUCT_STATUS.RASCUNHO]: "warning",
};

function ProductListPage() {
  const navigate = useNavigate();
  const { state, setFilters } = useListState(LIST_DEFAULTS);
  const { fetchProducts, bulkUpdate, bulkDelete } = useProducts();

  const [selectedIds, setSelectedIds] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Cursor vindo da URL (voltar do detalhe) — usado só na primeira carga;
  // deep-link em página N recomeça "anterior" da página 1 (limitação R-6).
  const initialAfterRef = useRef(state.after);

  const fetchPage = useCallback(
    (cursor) => {
      const effectiveCursor = cursor ?? initialAfterRef.current;
      initialAfterRef.current = null;

      return fetchProducts({
        search: state.search,
        status: state.status,
        stockRange: state.stockRange,
        sort: { key: state.sortKey, direction: state.sortDir },
        cursor: effectiveCursor,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchProducts, state.search, state.status, state.stockRange, state.sortKey, state.sortDir]
  );

  const pagination = usePagination(fetchPage);

  const columns = useMemo(
    () => [
      {
        key: "image",
        label: "",
        render: (row) =>
          row.image ? (
            <img className={styles.thumb} src={row.image} alt={row.name} loading="lazy" />
          ) : (
            <span className={styles.thumbFallback}>VS</span>
          ),
      },
      { key: "nameLower", label: "Nome", sortable: true, render: (row) => row.name },
      { key: "sku", label: "SKU", render: (row) => row.sku || "—" },
      {
        key: "category",
        label: "Categoria",
        render: (row) => row.categoryName || row.category || "—",
      },
      { key: "price", label: "Preço", sortable: true, render: (row) => formatBRL(row.price) },
      {
        key: "totalStock",
        label: "Estoque",
        sortable: true,
        render: (row) => row.totalStock ?? row.stock ?? 0,
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <Chip
            size="small"
            label={PRODUCT_STATUS_LABELS[row.status] || "Rascunho"}
            color={STATUS_CHIP_COLORS[row.status] || "warning"}
            variant="outlined"
          />
        ),
      },
      {
        key: "createdAt",
        label: "Criado em",
        sortable: true,
        render: (row) => formatDate(row.createdAt),
      },
    ],
    []
  );

  function handleSortChange({ key, direction }) {
    setFilters({ sortKey: key, sortDir: direction });
  }

  async function runBulkAction() {
    setConfirmLoading(true);

    let ok = false;

    if (confirm.action === "ativar") {
      ok = await bulkUpdate(selectedIds, { status: PRODUCT_STATUS.ATIVO }, `${selectedIds.length} produto(s) ativado(s).`);
    } else if (confirm.action === "desativar") {
      ok = await bulkUpdate(selectedIds, { status: PRODUCT_STATUS.INATIVO }, `${selectedIds.length} produto(s) desativado(s).`);
    } else if (confirm.action === "excluir") {
      ok = await bulkDelete(selectedIds);
    }

    setConfirmLoading(false);
    setConfirm(null);

    if (ok) {
      setSelectedIds([]);
      pagination.refresh();
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Produtos</h1>

        <Button
          component={Link}
          to={ROUTES.ADMIN_PRODUCT_NEW}
          variant="contained"
          startIcon={<AddIcon />}
        >
          Novo produto
        </Button>
      </div>

      <div className={styles.filters}>
        <TextField
          size="small"
          label="Buscar por nome ou SKU"
          defaultValue={state.search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setFilters({ search: e.target.value, status: "", stockRange: "" });
            }
          }}
          className={styles.searchField}
          helperText="Busca por início do nome/SKU (Enter aplica; limpa os demais filtros)"
        />

        <TextField
          select
          size="small"
          label="Status"
          value={state.status}
          onChange={(e) => setFilters({ status: e.target.value, search: "", stockRange: "" })}
          className={styles.selectField}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.values(PRODUCT_STATUS).map((status) => (
            <MenuItem key={status} value={status}>
              {PRODUCT_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Estoque"
          value={state.stockRange}
          onChange={(e) => setFilters({ stockRange: e.target.value, search: "", status: "" })}
          className={styles.selectField}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="baixo">Estoque baixo</MenuItem>
          <MenuItem value="zerado">Sem estoque</MenuItem>
        </TextField>
      </div>

      {selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <span>{selectedIds.length} selecionado(s)</span>

          <Button size="small" onClick={() => setConfirm({ action: "ativar", title: "Ativar produtos", message: `Ativar ${selectedIds.length} produto(s)? Eles ficarão visíveis na loja.` })}>
            Ativar
          </Button>

          <Button size="small" onClick={() => setConfirm({ action: "desativar", title: "Desativar produtos", message: `Desativar ${selectedIds.length} produto(s)? Eles ficarão ocultos na loja.` })}>
            Desativar
          </Button>

          <Button size="small" color="error" onClick={() => setConfirm({ action: "excluir", title: "Excluir produtos", message: `Excluir ${selectedIds.length} produto(s)? Produtos com pedidos são excluídos logicamente (histórico preservado); os demais, definitivamente.`, destructive: true })}>
            Excluir
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={pagination.items}
        loading={pagination.loading}
        error={pagination.error}
        onRetry={pagination.refresh}
        sort={{ key: state.sortKey, direction: state.sortDir }}
        onSortChange={handleSortChange}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => navigate(`${ROUTES.ADMIN_PRODUCTS}/${row.id}`)}
        pagination={pagination}
        emptyState={{
          title: "Nenhum produto encontrado",
          description: state.search || state.status || state.stockRange
            ? "Ajuste a busca ou os filtros para encontrar o que procura."
            : "Cadastre seu primeiro produto para começar a vender.",
          actionLabel: "Cadastrar produto",
          actionTo: ROUTES.ADMIN_PRODUCT_NEW,
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title || ""}
        message={confirm?.message}
        destructive={confirm?.destructive}
        loading={confirmLoading}
        confirmLabel={confirm?.destructive ? "Excluir" : "Confirmar"}
        onConfirm={runBulkAction}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

export default ProductListPage;
