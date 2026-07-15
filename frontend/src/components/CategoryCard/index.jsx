import { Link } from "react-router-dom";

import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

function CategoryCard({ category }) {
  // Leva ao catálogo filtrado pela categoria. `key` é o slug estável (ex.:
  // "masculino"), que casa com o slug real da categoria (slugify do nome).
  return (
    <Link className={styles.card} to={`${ROUTES.PRODUCTS}?categoria=${category.key}`}>
      {category.image ? (
        <img
          src={category.image}
          alt={category.imageAlt || category.name}
          className={styles.image}
          style={category.imagePosition ? { objectPosition: category.imagePosition } : undefined}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={styles.fallback}>
          <span>VS</span>
        </div>
      )}

      <div className={styles.overlay} />

      <h3 className={styles.name}>{category.name}</h3>
    </Link>
  );
}

export default CategoryCard;