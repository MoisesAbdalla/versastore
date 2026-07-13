import { usePublicCategories } from "../../hooks/usePublicCategories";
import styles from "./styles.module.css";

// Filtro de categoria em 2 níveis (FR-003). Primeiro nível: categorias raiz.
// Ao selecionar uma raiz com subcategorias, aparece o segundo nível para
// refinar. `onChange` recebe um patch de URL ({categoria?, sub?}).
function CategoryFilter({ categoria, sub, onChange }) {
  const { roots, subcategoriesOf, loading } = usePublicCategories();

  if (loading) {
    return <div className={styles.filter} aria-hidden="true" />;
  }

  const children = categoria ? subcategoriesOf(categoria) : [];

  return (
    <div className={styles.wrapper}>
      <div className={styles.filter}>
        <button
          type="button"
          className={!categoria ? `${styles.chip} ${styles.active}` : styles.chip}
          onClick={() => onChange({ categoria: "", sub: "" })}
        >
          Todas
        </button>

        {roots.map((root) => (
          <button
            key={root.id}
            type="button"
            className={categoria === root.slug ? `${styles.chip} ${styles.active}` : styles.chip}
            onClick={() => onChange({ categoria: root.slug, sub: "" })}
          >
            {root.name}
          </button>
        ))}
      </div>

      {children.length > 0 && (
        <div className={`${styles.filter} ${styles.subRow}`}>
          <button
            type="button"
            className={!sub ? `${styles.subChip} ${styles.active}` : styles.subChip}
            onClick={() => onChange({ sub: "" })}
          >
            Todos
          </button>

          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              className={sub === child.slug ? `${styles.subChip} ${styles.active}` : styles.subChip}
              onClick={() => onChange({ sub: child.slug })}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryFilter;
