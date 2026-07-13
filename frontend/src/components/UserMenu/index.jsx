import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useAuth } from "../../contexts/AuthContext";
import { logout } from "../../services/authService";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

// Menu do usuário logado (feature 007). Itens apontam para as ABAS da área de
// conta (uma página, layout único). Estrutura em lista de dados para ser
// extensível: a Lista de Desejos entra aqui quando virar funcional (Fase C).
const MENU_ITEMS = [
  { to: ROUTES.CONTA, label: "Minha conta" },
  { to: ROUTES.CONTA_PEDIDOS, label: "Meus pedidos" },
  { to: ROUTES.CONTA_ENDERECOS, label: "Meus endereços" },
];

function UserMenu() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fecha ao clicar fora ou apertar Escape.
  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);

    try {
      await logout();
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error(error);
    }
  }

  const displayName = user?.displayName || user?.email;

  return (
    <div className={styles.menu} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <PersonOutlineOutlinedIcon />
        <span className={styles.name}>{displayName}</span>
        <KeyboardArrowDownIcon className={styles.caret} fontSize="small" />
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          {MENU_ITEMS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              className={styles.item}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              to={ROUTES.ADMIN}
              role="menuitem"
              className={styles.item}
              onClick={() => setOpen(false)}
            >
              Painel admin
            </Link>
          )}

          <div className={styles.separator} role="separator" />

          <button type="button" role="menuitem" className={styles.logout} onClick={handleLogout}>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
