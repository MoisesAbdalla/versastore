import styles from "./styles.module.css";

import categories from "../../data/categories";
import CategoryCard from "../CategoryCard";
import { useHomeSettings } from "../../hooks/useHomeSettings";

function Categories() {
  const { categoryImages, categoryPositions } = useHomeSettings();

  return (
    <section id="categorias" className={styles.section}>
      <h2>Categorias</h2>

      <div className={styles.grid}>
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={{
              ...category,
              image: categoryImages[category.key] || category.image,
              imagePosition: categoryPositions[category.key] || "center",
            }}
          />
        ))}
      </div>
    </section>
  );
}

export default Categories;
