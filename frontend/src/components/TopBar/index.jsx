import styles from "./styles.module.css";

import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

function TopBar() {
  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <span>
          <LocalShippingOutlinedIcon fontSize="small" />
          Frete grátis acima de R$199
        </span>
      </div>

      <div className={styles.right}>
        <span>
          <Inventory2OutlinedIcon fontSize="small" />
          Meus pedidos
        </span>

        <span>
          <SupportAgentOutlinedIcon fontSize="small" />
          Atendimento
        </span>
      </div>
    </div>
  );
}

export default TopBar;