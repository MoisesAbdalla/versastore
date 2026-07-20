import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import MainLayout from "../../../layouts/MainLayout";
import { formatOrderNumber } from "../../../services/orderService";
import ROUTES from "../../../constants/routes";
import styles from "./styles.module.css";

// Confirmação pós-checkout (feature 009 / M4a): pedido criado, aguardando
// pagamento. O pagamento real é tratado no M4b.
function CheckoutSuccess() {
  const location = useLocation();
  const orderNumber = location.state?.orderNumber;
  // Retirada na loja (feature 016): mostra onde buscar o pedido.
  const pickupAddress = location.state?.pickupAddress || null;

  useEffect(() => {
    document.title = "Pedido criado · Versa Store";
  }, []);

  return (
    <MainLayout>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.check} aria-hidden="true">
            ✓
          </div>

          <h1 className={styles.title}>Pedido criado!</h1>

          {orderNumber != null && (
            <p className={styles.number}>Número {formatOrderNumber(orderNumber)}</p>
          )}

          <p className={styles.text}>
            Seu pedido foi registrado e está <strong>aguardando pagamento</strong>. Em breve você
            poderá concluir o pagamento — avisaremos assim que estiver disponível.
          </p>

          {pickupAddress && (
            <p className={styles.text}>
              <strong>Retirada na loja:</strong> assim que o pedido estiver{" "}
              <strong>pronto para retirada</strong>, é só buscar em: {pickupAddress}
            </p>
          )}

          <div className={styles.actions}>
            <Link className={styles.primary} to={ROUTES.CONTA_PEDIDOS}>
              Ver meus pedidos
            </Link>
            <Link className={styles.secondary} to={ROUTES.PRODUCTS}>
              Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default CheckoutSuccess;
