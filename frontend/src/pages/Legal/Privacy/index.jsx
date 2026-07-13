import { useEffect } from "react";
import MainLayout from "../../../layouts/MainLayout";
import { TERMS_VERSION } from "../../../constants/terms";
import styles from "../styles.module.css";

// Conteúdo PROVISÓRIO (feature 007) — a política definitiva (LGPD) entra no M8.
function Privacy() {
  useEffect(() => {
    document.title = "Política de Privacidade · Versa Store";
  }, []);

  return (
    <MainLayout>
      <div className={styles.page}>
        <p className={styles.provisional}>
          Documento provisório — a política definitiva será publicada em breve.
        </p>

        <h1 className={styles.title}>Política de Privacidade</h1>
        <p className={styles.version}>Versão {TERMS_VERSION}</p>

        <p className={styles.paragraph}>
          A Versa Store coleta os dados que você fornece (nome, e-mail, telefone e endereços) para
          criar e gerenciar sua conta, processar pedidos e entregar suas compras. Seus dados não são
          vendidos a terceiros e são tratados conforme a Lei Geral de Proteção de Dados (LGPD).
        </p>

        <p className={styles.paragraph}>
          Este é um texto preliminar para viabilizar o cadastro. A versão completa, incluindo seus
          direitos como titular dos dados e os canais de contato, será disponibilizada nesta página.
        </p>
      </div>
    </MainLayout>
  );
}

export default Privacy;
