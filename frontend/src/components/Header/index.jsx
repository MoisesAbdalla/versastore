import styles from "./styles.module.css";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { useNavigate } from "react-router-dom";
import  ROUTES  from "../../constants/routes";
import { useAuth } from "../../contexts/AuthContext";
import { logout } from "../../services/authService";


function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleLogout() {
  try {
    await logout();
    navigate("/");
  } catch (error) {
    console.error(error);
  }
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
        />

        <button>
          <SearchOutlinedIcon />
        </button>
      </div>

      <div className={styles.actions}>
          {user ? (
            <button onClick={handleLogout}>
              <PersonOutlineOutlinedIcon />
              <span className={styles.actionLabel}>{user?.email}</span>
            </button>
          ) : (
            <button onClick={() => navigate(ROUTES.LOGIN)}>
              <PersonOutlineOutlinedIcon />
              <span className={styles.actionLabel}>Entrar</span>
            </button>
          )}

          <button>
            <FavoriteBorderOutlinedIcon />
          </button>

          <button>
            <ShoppingCartOutlinedIcon />
          </button>
        </div>
    </header>
  );
}

export default Header;