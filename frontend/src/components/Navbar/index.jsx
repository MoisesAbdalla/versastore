import styles from "./styles.module.css";
import navigation from "../../data/navigation";
import { usePublicCategories } from "../../hooks/usePublicCategories";

import { NavLink } from "react-router-dom";

function Navbar() {
  const { tree } = usePublicCategories();

  return (
    <nav className={styles.navbar}>
      <ul className={styles.menu}>
        {navigation.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.path}
              end
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              {item.title}
            </NavLink>
          </li>
        ))}

        {tree.map((category) => (
          <li key={category.id}>
            <NavLink
              to={`/products?categoria=${category.slug}`}
              className={({ isActive }) => (isActive ? styles.active : "")}
            >
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;
