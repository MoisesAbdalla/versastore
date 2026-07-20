import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import ProductGallery from "../../components/ProductGallery";
import VariationSelector from "../../components/VariationSelector";
import PriceTag from "../../components/PriceTag";
import StarRating from "../../components/StarRating";
import ProductReviews from "../../components/ProductReviews";
import { useProductPage } from "../../hooks/useProductPage";
import { useVariationSelection } from "../../hooks/useVariationSelection";
import { usePublicCategories } from "../../hooks/usePublicCategories";
import { useCart } from "../../contexts/CartContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { cloudinaryUrl, IMAGE_WIDTHS } from "../../services/cloudinaryService";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../constants/product";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

const ADD_ERRORS = {
  "variacao-obrigatoria": "Selecione as opções antes de adicionar.",
  "sem-estoque": "Esta opção está esgotada.",
  "estoque-insuficiente": "Quantidade acima do estoque disponível.",
};

function Product() {
  const { id } = useParams();
  const { product, loading, notFound, error, refresh } = useProductPage(id);
  // Seleção POR ATRIBUTO (feature 008): uma escolha por atributo, ordem livre.
  const { hasVariations, selected, select, optionsByAttribute, resolvedVariation, currentStock, canBuy } =
    useVariationSelection(product);
  const { slugById } = usePublicCategories();
  const { addItem } = useCart();
  const { toastSuccess, toastError } = useFeedback();

  const [attempted, setAttempted] = useState(false);

  // Meta/OG do produto (feature 017): nome, descrição textual e imagem —
  // visíveis para crawlers que executam JS (limitação SPA documentada no R-1).
  const plainDescription = product?.description
    ? product.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
    : undefined;

  usePageMeta({
    title: product ? product.name : "Produto",
    description: plainDescription,
    image: product?.image ? cloudinaryUrl(product.image, { w: IMAGE_WIDTHS.card }) : undefined,
  });

  function handleAdd() {
    setAttempted(true);

    const result = addItem(product, resolvedVariation, 1);

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

  // Botão: esgotado (desabilitado) quando a combinação resolvida — ou o produto
  // simples — está sem estoque. Com seleção incompleta, o botão fica ativo e o
  // clique orienta a completar a escolha.
  const selectionResolved = Boolean(resolvedVariation) || !hasVariations;
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

          {(product.ratingCount ?? 0) > 0 && (
            <StarRating avg={product.ratingAvg ?? 0} count={product.ratingCount ?? 0} size="sm" showCount />
          )}

          <PriceTag product={product} size="lg" />

          {hasVariations && (
            <VariationSelector
              optionsByAttribute={optionsByAttribute}
              selected={selected}
              onSelect={select}
            />
          )}

          {selectionResolved ? (
            <p className={styles.stock}>
              {currentStock > 0 ? `${currentStock} em estoque` : "Esgotado"}
              {showLowStock && <span className={styles.lowStock}> · últimas unidades!</span>}
            </p>
          ) : (
            <p className={styles.stockHint}>Selecione as opções para ver a disponibilidade.</p>
          )}

          <button
            type="button"
            className={styles.addButton}
            onClick={handleAdd}
            disabled={isSoldOut}
          >
            {isSoldOut ? "Esgotado" : "Adicionar ao carrinho"}
          </button>

          {attempted && hasVariations && !resolvedVariation && (
            <p className={styles.selectHint}>Escolha as opções acima.</p>
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

      <div className={styles.reviewsWrap}>
        <ProductReviews product={product} />
      </div>
    </MainLayout>
  );
}

export default Product;
