import EmptyState from "../../../components/EmptyState";
import ROUTES from "../../../constants/routes";

// Aba "Meus pedidos" (feature 007, US4). Conteúdo definitivo entra na US4.
function AccountOrders() {
  return (
    <EmptyState
      title="Seus pedidos aparecerão aqui"
      description="Assim que você fizer um pedido, ele fica disponível nesta área."
      actionLabel="Ver produtos"
      actionTo={ROUTES.PRODUCTS}
    />
  );
}

export default AccountOrders;
