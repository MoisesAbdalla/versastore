import styles from "./styles.module.css";
import navigation from "../../data/navigation";

import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <ul className={styles.menu}>
        {navigation.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                isActive ? styles.active : ""
              }
            >
              {item.title}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;