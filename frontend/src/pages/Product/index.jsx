import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import ProductGallery from "../../components/ProductGallery";
import VariationSelector from "../../components/VariationSelector";
import PriceTag from "../../components/PriceTag";
import { useProductPage } from "../../hooks/useProductPage";
import { usePublicCategories } from "../../hooks/usePublicCategories";
import { useCart } from "../../contexts/CartContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../constants/product";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

const ADD_ERRORS = {
  "variacao-obrigatoria": "Selecione uma opção antes de adicionar.",
  "sem-estoque": "Esta opção está esgotada.",
  "estoque-insuficiente": "Quantidade acima do estoque disponível.",
};

function Product() {
  const { id } = useParams();
  const { product, loading, notFound, error, selection, selectVariation, hasVariations, currentStock, canBuy, refresh } =
    useProductPage(id);
  const { slugById } = usePublicCategories();
  const { addItem } = useCart();
  const { toastSuccess, toastError } = useFeedback();

  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    document.title = product ? `${product.name} · Versa Store` : "Produto · Versa Store";
  }, [product]);

  function handleAdd() {
    setAttempted(true);

    const result = addItem(product, selection, 1);

    if (result.ok) {
      toastSuccess("Produto adicionado ao carrinho.");
    } else {
      toastError(ADD_ERRORS[result.reason] || "Não foi possível adicionar ao carrinho.");
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.page}>
          <div className={styles.skeletonGallery} aria-hidden="true" />
          <div className={styles.skeletonInfo} aria-hidden="true" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className={styles.stateBox} role="alert">
          <p>Não foi possível carregar o produto. Verifique sua conexão.</p>
          <button className={styles.ghostButton} onClick={refresh}>
            Tentar novamente
          </button>
        </div>
      </MainLayout>
    );
  }

  if (notFound) {
    return (
      <MainLayout>
        <div className={styles.stateBox}>
          <p className={styles.notFoundTitle}>Produto não encontrado</p>
          <p className={styles.notFoundText}>
            Ele pode ter saído do catálogo. Veja outros produtos da loja.
          </p>
          <Link className={styles.ghostButton} to={ROUTES.PRODUCTS}>
            Ver o catálogo
          </Link>
        </div>
      </MainLayout>
    );
  }

  const threshold = product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const showLowStock = currentStock != null && currentStock > 0 && currentStock <= threshold;
  const categorySlug = slugById[product.categoryId];

  // Botão: esgotado (desabilitado) quando a opção escolhida — ou o produto
  // simples — está sem estoque. Sem variação escolhida, o botão fica ativo e o
  // clique orienta a selecionar.
  const selectionResolved = selection || !hasVariations;
  const isSoldOut = selectionResolved && !canBuy;

  return (
    <MainLayout>
      <div className={styles.page}>
        <div className={styles.galleryCol}>
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className={styles.infoCol}>
          {(product.categoryName || product.category) && (
            <Link
              className={styles.category}
              to={categorySlug ? `${ROUTES.PRODUCTS}?categoria=${categorySlug}` : ROUTES.PRODUCTS}
            >
              {product.categoryName || product.category}
            </Link>
          )}

          <h1 className={styles.name}>{product.name}</h1>

          <PriceTag product={product} size="lg" />

          {hasVariations && (
            <VariationSelector
              variations={product.variations}
              selectedId={selection?.id}
              onSelect={selectVariation}
            />
          )}

          {selectionResolved ? (
            <p className={styles.stock}>
              {currentStock > 0 ? `${currentStock} em estoque` : "Esgotado"}
              {showLowStock && <span className={styles.lowStock}> · últimas unidades!</span>}
            </p>
          ) : (
            <p className={styles.stockHint}>Selecione uma opção para ver a disponibilidade.</p>
          )}

          <button
            type="button"
            className={styles.addButton}
            onClick={handleAdd}
            disabled={isSoldOut}
          >
            {isSoldOut ? "Esgotado" : "Adicionar ao carrinho"}
          </button>

          {attempted && hasVariations && !selection && (
            <p className={styles.selectHint}>Escolha uma opção acima.</p>
          )}

          {product.description && (
            <div className={styles.description}>
              <h2 className={styles.descTitle}>Descrição</h2>
              {/* HTML sanitizado por allowlist na gravação (RichTextField) */}
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default Product;
