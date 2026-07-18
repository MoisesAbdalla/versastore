import { Link, useNavigate } from "react-router-dom";
import styles from "./styles.module.css";

import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import FavoriteIcon from "@mui/icons-material/Favorite";
import PriceTag from "../PriceTag";
import { cloudinaryUrl, IMAGE_WIDTHS } from "../../services/cloudinaryService";
import { useAuth } from "../../contexts/AuthContext";
import { useWishlist } from "../../contexts/WishlistContext";
import ROUTES from "../../constants/routes";

function isSoldOut(product) {
  if ((product.variations || []).length > 0) {
    return (product.totalStock ?? 0) === 0;
  }

  return (product.stock ?? product.totalStock ?? 0) === 0;
}

function ProductCard({ product }) {
  const soldOut = isSoldOut(product);
  const image = cloudinaryUrl(product.image, { w: IMAGE_WIDTHS.card });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggle } = useWishlist();
  const favorited = isFavorite(product.id);

  // O card é um link; o coração não deve navegar para o produto.
  function handleFavorite(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    toggle(product.id);
  }

  return (
    <Link className={styles.card} to={`${ROUTES.PRODUCT}/${product.id}`}>
      <button
        type="button"
        className={favorited ? `${styles.favorite} ${styles.favoriteActive}` : styles.favorite}
        aria-label={favorited ? "Remover da lista de desejos" : "Adicionar à lista de desejos"}
        aria-pressed={favorited}
        onClick={handleFavorite}
      >
        {favorited ? <FavoriteIcon /> : <FavoriteBorderOutlinedIcon />}
      </button>

      <div className={styles.imageWrap}>
        {image ? (
          <img
            src={image}
            alt={product.imageAlt || product.name}
            className={styles.image}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={styles.fallback}>
            <span>VS</span>
          </div>
        )}

        {soldOut && <span className={styles.soldOut}>Esgotado</span>}
      </div>

      <div className={styles.info}>
        <span className={styles.category}>
          {product.categoryName || product.category}
        </span>

        <h3>{product.name}</h3>

        <PriceTag product={product} />
      </div>
    </Link>
  );
}

export default ProductCard;
