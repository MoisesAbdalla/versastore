import { usePublicCategories } from "../../hooks/usePublicCategories";
import styles from "./styles.module.css";

// Filtro de categoria do catálogo (estado na URL via onChange do pai).
// `value`/`onChange` operam em SLUG (a URL usa slug).
function CategoryFilter({ value, onChange }) {
  const { flat, loading } = usePublicCategories();

  if (loading) {
    return <div className={styles.filter} aria-hidden="true" />;
  }

  return (
    <div className={styles.filter}>
      <button
        type="button"
        className={!value ? `${styles.chip} ${styles.active}` : styles.chip}
        onClick={() => onChange("")}
      >
        Todas
      </button>

      {flat.map((category) => (
        <button
          key={category.id}
          type="button"
          className={value === category.slug ? `${styles.chip} ${styles.active}` : styles.chip}
          onClick={() => onChange(category.slug)}
        >
          {category.parentId ? `↳ ${category.name}` : category.name}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;
