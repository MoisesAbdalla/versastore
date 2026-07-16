import styles from "./styles.module.css";

import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

import { useShippingSettings } from "../../hooks/useShippingSettings";
import { formatBRL } from "../../utils/format";

function TopBar() {
  // Banner conectado ao limite real de frete grátis (feature 011). Sem limite
  // configurado, o banner de frete some.
  const { freeShippingThreshold } = useShippingSettings();

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        {freeShippingThreshold > 0 && (
          <span>
            <LocalShippingOutlinedIcon fontSize="small" />
            Frete grátis acima de {formatBRL(freeShippingThreshold)}
          </span>
        )}
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