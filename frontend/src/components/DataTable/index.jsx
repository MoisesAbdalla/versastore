import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Checkbox from "@mui/material/Checkbox";
import Skeleton from "@mui/material/Skeleton";
import Button from "@mui/material/Button";

import EmptyState from "../EmptyState";
import styles from "./styles.module.css";

const SKELETON_ROWS = 6;

// Tabela padrão do painel: skeleton no carregamento (FR-082), ordenação restrita às
// colunas indexadas (research R-8), seleção em massa, paginação por cursor (FR-088)
// e estado vazio orientando o próximo passo (FR-084).
//
// columns: [{ key, label, sortable?, render?(row) }]
// pagination: retorno do usePagination ({ page, hasMore, next, prev, loading })
function DataTable({
  columns,
  rows,
  rowKey = "id",
  loading = false,
  error = null,
  sort,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  pagination,
  emptyState,
  onRetry,
}) {
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  function toggleAll() {
    onSelectionChange(allSelected ? [] : rows.map((row) => row[rowKey]));
  }

  function toggleOne(id) {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id]
    );
  }

  function handleSort(key) {
    const direction = sort?.key === key && sort?.direction === "asc" ? "desc" : "asc";

    onSortChange({ key, direction });
  }

  if (error) {
    return (
      <div className={styles.errorState} role="alert">
        <p>Não foi possível carregar os dados. Verifique sua conexão.</p>

        {onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return <EmptyState {...emptyState} />;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    inputProps={{ "aria-label": "Selecionar todos" }}
                  />
                </TableCell>
              )}

              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.sortable && onSortChange ? (
                    <TableSortLabel
                      active={sort?.key === column.key}
                      direction={sort?.key === column.key ? sort.direction : "asc"}
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <TableRow key={index}>
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Skeleton variant="rectangular" width={20} height={20} />
                      </TableCell>
                    )}

                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow
                    key={row[rowKey]}
                    hover={Boolean(onRowClick)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={onRowClick ? styles.clickableRow : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" && e.target === e.currentTarget) {
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                  >
                    {selectable && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(row[rowKey])}
                          onChange={() => toggleOne(row[rowKey])}
                          inputProps={{ "aria-label": "Selecionar linha" }}
                        />
                      </TableCell>
                    )}

                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.render ? column.render(row) : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className={styles.pagination}>
          <Button
            size="small"
            disabled={pagination.page <= 1 || pagination.loading}
            onClick={pagination.prev}
          >
            Anterior
          </Button>

          <span className={styles.pageLabel}>Página {pagination.page}</span>

          <Button
            size="small"
            disabled={!pagination.hasMore || pagination.loading}
            onClick={pagination.next}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
