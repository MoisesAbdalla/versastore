import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";

import { listProducts } from "../../services/productService";
import { listOrders, formatOrderNumber } from "../../services/orderService";
import { formatBRL } from "../../utils/format";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 350;

// Busca global do header (FR-080): produtos (prefixo de nome/SKU) e pedidos
// (nº exato ou prefixo de cliente), com atalho direto para o detalhe.
function GlobalSearch() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [term, setTerm] = useState("");
  const [results, setResults] = useState(null); // { products, orders }
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (term.trim().length < MIN_CHARS) {
      setResults(null);
      setOpen(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const [products, orders] = await Promise.all([
          listProducts({ search: term, pageSize: 5 }),
          listOrders({ search: term, pageSize: 5 }),
        ]);

        setResults({ products: products.items, orders: orders.items });
        setOpen(true);
      } catch {
        setResults({ products: [], orders: [] });
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function go(path) {
    setOpen(false);
    setTerm("");
    navigate(path);
  }

  const isEmpty =
    results && results.products.length === 0 && results.orders.length === 0;

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <TextField
        size="small"
        placeholder="Buscar produtos e pedidos…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => results && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={styles.searchField}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: { "aria-label": "Busca global de produtos e pedidos" },
        }}
      />

      {open && results && (
        <div className={styles.searchResults} role="listbox" aria-label="Resultados da busca">
          {loading && <p className={styles.searchHint}>Buscando…</p>}

          {isEmpty && !loading && (
            <p className={styles.searchHint}>Nada encontrado para "{term}".</p>
          )}

          {results.products.length > 0 && (
            <div className={styles.searchGroup}>
              <span className={styles.searchGroupTitle}>Produtos</span>

              {results.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={styles.searchItem}
                  onClick={() => go(`${ROUTES.ADMIN_PRODUCTS}/${product.id}`)}
                >
                  <span>{product.name}</span>
                  <span className={styles.searchItemMuted}>{formatBRL(product.price)}</span>
                </button>
              ))}
            </div>
          )}

          {results.orders.length > 0 && (
            <div className={styles.searchGroup}>
              <span className={styles.searchGroupTitle}>Pedidos</span>

              {results.orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={styles.searchItem}
                  onClick={() => go(`${ROUTES.ADMIN_ORDERS}/${order.id}`)}
                >
                  <span>
                    {formatOrderNumber(order.orderNumber)} · {order.customerName || order.customerEmail}
                  </span>
                  <span className={styles.searchItemMuted}>{formatBRL(order.total)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
