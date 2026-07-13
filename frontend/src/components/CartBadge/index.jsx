import { Link } from "react-router-dom";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

import { useCart } from "../../contexts/CartContext";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

// Ícone de carrinho do header com contador (feature 005, FR-009). Leva à
// página do carrinho.
function CartBadge() {
  const { count } = useCart();

  return (
    <Link className={styles.badge} to={ROUTES.CART} aria-label={`Carrinho (${count} itens)`}>
      <ShoppingCartOutlinedIcon />
      {count > 0 && <span className={styles.count}>{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}

export default CartBadge;
