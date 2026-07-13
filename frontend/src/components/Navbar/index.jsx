import { Link, useLocation, useSearchParams } from "react-router-dom";

import styles from "./styles.module.css";
import navigation from "../../data/navigation";
import { usePublicCategories } from "../../hooks/usePublicCategories";

// Item ativo considera o pathname E o query param `categoria` — senão todos os
// links /products* ficariam ativos ao mesmo tempo (FR-003a). "Produtos" só é
// ativo sem categoria; cada categoria só com o seu slug.
function computeActive({ pathname, categoria }) {
  return function isActive(item) {
    if (item.slug !== undefined) {
      return pathname === "/products" && categoria === item.slug;
    }

    if (item.path === "/products") {
      return pathname === "/products" && !categoria;
    }

    return pathname === item.path;
  };
}

function Navbar() {
  const { tree } = usePublicCategories();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isActive = computeActive({
    pathname: location.pathname,
    categoria: searchParams.get("categoria") || "",
  });

  const categoryItems = tree.map((category) => ({
    id: `cat-${category.id}`,
    title: category.name,
    slug: category.slug,
    path: `/products?categoria=${category.slug}`,
  }));

  return (
    <nav className={styles.navbar}>
      <ul className={styles.menu}>
        {[...navigation, ...categoryItems].map((item) => (
          <li key={item.id}>
            <Link to={item.path} className={isActive(item) ? styles.active : ""}>
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;
