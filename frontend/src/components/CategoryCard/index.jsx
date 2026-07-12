import styles from "./styles.module.css";

function CategoryCard({ category }) {
  return (
    <div className={styles.card}>
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
    </div>
  );
}

export default CategoryCard;