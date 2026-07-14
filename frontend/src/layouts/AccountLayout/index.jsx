import { NavLink, Outlet } from "react-router-dom";
import MainLayout from "../MainLayout";
import PageContainer from "../../components/PageContainer";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

// Abas da área de conta (feature 007). Estrutura extensível: a Lista de Desejos
// entra como nova aba na Fase C, sem novo layout.
const TABS = [
  { to: ROUTES.CONTA, label: "Meus dados", end: true },
  { to: ROUTES.CONTA_PEDIDOS, label: "Meus pedidos", end: false },
  { to: ROUTES.CONTA_ENDERECOS, label: "Meus endereços", end: false },
];

// Layout único da conta do cliente: uma página, abas de navegação e um Outlet
// para o conteúdo de cada aba (dados / pedidos / endereços). Evita três páginas
// soltas com layouts divergentes.
function AccountLayout() {
  return (
    <MainLayout>
      <PageContainer narrow>
        <h1 className={styles.title}>Minha conta</h1>

        <nav className={styles.tabs} aria-label="Seções da conta">
          {TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.panel}>
          <Outlet />
        </div>
      </PageContainer>
    </MainLayout>
  );
}

export default AccountLayout;
