import { useState } from "react";
import styles from "./styles.module.css";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { useNavigate } from "react-router-dom";
import  ROUTES  from "../../constants/routes";
import { useAuth } from "../../contexts/AuthContext";
import CartBadge from "../CartBadge";
import WishlistBadge from "../WishlistBadge";
import UserMenu from "../UserMenu";


function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [term, setTerm] = useState("");

  // Busca dispara no submit (Enter/lupa) navegando ao catálogo — sem consulta
  // ao vivo (FR-012).
  function submitSearch() {
    const q = term.trim();

    navigate(q ? `${ROUTES.PRODUCTS}?q=${encodeURIComponent(q)}` : ROUTES.PRODUCTS);
  }

  return (
    <header className={styles.header}>
      <div className={styles.logo}
      onClick={() => navigate(ROUTES.HOME)}
      >
        <span className={styles.mark}>VS</span>
        <span className={styles.wordmark}>
          Versa
          <span className={styles.wordmarkSub}>Store</span>
        </span>
      </div>

      <div className={styles.search}>
        <input
          type="text"
          placeholder="Pesquisar produtos..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submitSearch();
            }
          }}
          aria-label="Buscar produtos"
        />

        <button onClick={submitSearch} aria-label="Buscar">
          <SearchOutlinedIcon />
        </button>
      </div>

      <div className={styles.actions}>
          {user ? (
            <UserMenu />
          ) : (
            <button onClick={() => navigate(ROUTES.LOGIN)}>
              <PersonOutlineOutlinedIcon />
              <span className={styles.actionLabel}>Entrar</span>
            </button>
          )}

          <WishlistBadge />

          <CartBadge />
        </div>
    </header>
  );
}

export default Header;