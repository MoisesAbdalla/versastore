import { useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import ProductCard from "../../components/ProductCard";
import CategoryFilter from "../../components/CategoryFilter";
import SortSelect from "../../components/SortSelect";
import { useCatalog } from "../../hooks/useCatalog";
import styles from "./styles.module.css";

function CardSkeleton() {
  return <div className={styles.skeleton} aria-hidden="true" />;
}

function Products() {
  const { items, loading, error, hasMore, loadMore, refresh, filters, setFilters } = useCatalog();

  const hasFilters = Boolean(filters.categoria || filters.q);

  useEffect(() => {
    document.title = filters.q
      ? `Busca: ${filters.q} · Versa Store`
      : "Produtos · Versa Store";
  }, [filters.q]);

  return (
    <MainLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {filters.q ? `Resultados para "${filters.q}"` : "Produtos"}
          </h1>

          <SortSelect
            value={filters.ordenar}
            onChange={(ordenar) => setFilters({ ordenar })}
            disabled={Boolean(filters.q)}
          />
        </header>

        <CategoryFilter
          categoria={filters.categoria}
          sub={filters.sub}
          onChange={(patch) => setFilters(patch)}
        />

        {error ? (
          <div className={styles.stateBox} role="alert">
            <p>Não foi possível carregar os produtos. Verifique sua conexão.</p>
            <button className={styles.retryButton} onClick={refresh}>
              Tentar novamente
            </button>
          </div>
        ) : loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.stateBox}>
            <p className={styles.emptyTitle}>Nenhum produto encontrado</p>
            <p className={styles.emptyText}>
              {hasFilters
                ? "Tente ajustar a busca ou os filtros."
                : "Em breve novidades na loja."}
            </p>
            {hasFilters && (
              <button
                className={styles.retryButton}
                onClick={() => setFilters({ categoria: "", sub: "", q: "", ordenar: "recentes" })}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className={styles.loadMoreWrap}>
                <button className={styles.loadMore} onClick={loadMore}>
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default Products;
