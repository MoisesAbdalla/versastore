import EmptyState from "../../../components/EmptyState";
import ROUTES from "../../../constants/routes";

// Aba "Meus endereços" (feature 007, US5). CRUD com busca por CEP entra na US5.
function AccountAddresses() {
  return (
    <EmptyState
      title="Você ainda não cadastrou endereços"
      description="Cadastre um endereço para agilizar suas compras."
      actionLabel="Ver produtos"
      actionTo={ROUTES.PRODUCTS}
    />
  );
}

export default AccountAddresses;
