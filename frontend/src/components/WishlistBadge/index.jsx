import { Link } from "react-router-dom";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";

import { useWishlist } from "../../contexts/WishlistContext";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

// Ícone de lista de desejos do header com contador (feature 014). Leva à aba
// "Meus desejos" da conta (rota privada — sem login, redireciona ao login).
function WishlistBadge() {
  const { count } = useWishlist();

  return (
    <Link
      className={styles.badge}
      to={ROUTES.CONTA_DESEJOS}
      aria-label={`Lista de desejos (${count} itens)`}
    >
      <FavoriteBorderOutlinedIcon />
      {count > 0 && <span className={styles.count}>{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}

export default WishlistBadge;
