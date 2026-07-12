import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CategoryIcon from "@mui/icons-material/Category";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleIcon from "@mui/icons-material/People";
import AssessmentIcon from "@mui/icons-material/Assessment";
import WallpaperIcon from "@mui/icons-material/Wallpaper";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LogoutIcon from "@mui/icons-material/Logout";
import { signOut } from "firebase/auth";

import auth from "../../firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import ROUTES from "../../constants/routes";
import GlobalSearch from "./GlobalSearch";
import styles from "./styles.module.css";

const NAV_ITEMS = [
  { to: ROUTES.ADMIN, label: "Visão geral", icon: DashboardIcon, end: true },
  { to: ROUTES.ADMIN_PRODUCTS, label: "Produtos", icon: Inventory2Icon },
  { to: ROUTES.ADMIN_CATEGORIES, label: "Categorias", icon: CategoryIcon },
  { to: ROUTES.ADMIN_ORDERS, label: "Pedidos", icon: ReceiptLongIcon },
  { to: ROUTES.ADMIN_CUSTOMERS, label: "Clientes", icon: PeopleIcon },
  { to: ROUTES.ADMIN_REPORTS, label: "Relatórios", icon: AssessmentIcon },
  { to: ROUTES.ADMIN_APPEARANCE, label: "Aparência", icon: WallpaperIcon },
];

function SidebarContent({ onNavigate }) {
  return (
    <nav className={styles.nav} aria-label="Módulos do painel">
      <div className={styles.brand}>
        <span className={styles.brandMark}>V</span>
        <span className={styles.brandName}>Versa Store</span>
      </div>

      <ul className={styles.navList}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <Icon fontSize="small" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <NavLink to={ROUTES.HOME} className={styles.storeLink} onClick={onNavigate}>
        <StorefrontIcon fontSize="small" />
        <span>Ver a loja</span>
      </NavLink>
    </nav>
  );
}

// Layout do painel (US1): sidebar fixa em desktop, drawer em mobile,
// header com nome do usuário logado e slot de busca global (preenchido no Polish).
function AdminLayout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    await signOut(auth);
    setUser(null);
    navigate(ROUTES.HOME);
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <SidebarContent />
      </aside>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className={styles.drawerContent}>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </div>
      </Drawer>

      <div className={styles.main}>
        <header className={styles.header}>
          <IconButton
            className={styles.menuButton}
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </IconButton>

          <GlobalSearch />

          <div className={styles.headerSpacer} />

          <div className={styles.userArea}>
            <span className={styles.userName}>
              {user?.displayName || user?.email}
            </span>

            <IconButton onClick={handleLogout} aria-label="Sair" size="small">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
