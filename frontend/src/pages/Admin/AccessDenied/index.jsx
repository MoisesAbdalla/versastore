import { Link } from "react-router-dom";
import MainLayout from "../../../layouts/MainLayout";
import ROUTES from "../../../constants/routes";
import styles from "./styles.module.css";

function AccessDenied() {
  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Acesso não autorizado</h1>

        <p className={styles.message}>
          Esta área é restrita aos administradores da loja. Se você acredita que
          deveria ter acesso, fale com o responsável pela conta.
        </p>

        <Link className={styles.action} to={ROUTES.HOME}>
          Voltar para a loja
        </Link>
      </div>
    </MainLayout>
  );
}

export default AccessDenied;
