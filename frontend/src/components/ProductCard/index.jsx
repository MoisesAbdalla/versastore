import styles from "./styles.module.css";

import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

function ProductCard({ product }) {
  return (
    <div className={styles.card}>
      <button className={styles.favorite}>
        <FavoriteBorderOutlinedIcon />
      </button>

      <div className={styles.imageWrap}>
        {product.image ? (
          <img
            src={product.image}
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
      </div>

      <div className={styles.info}>
        <span className={styles.category}>
          {product.category}
        </span>

        <h3>{product.name}</h3>

        {product.rating != null && (
          <div className={styles.rating}>
            <StarRoundedIcon />
            {product.rating}
          </div>
        )}

        <div className={styles.price}>
          {product.oldPrice != null && (
            <span className={styles.oldPrice}>
              R$ {product.oldPrice.toFixed(2)}
            </span>
          )}

          <span className={styles.currentPrice}>
            R$ {product.price.toFixed(2)}
          </span>
        </div>

        <button className={styles.buyButton}>
          Comprar
        </button>
      </div>
    </div>
  );
}

export default ProductCard;