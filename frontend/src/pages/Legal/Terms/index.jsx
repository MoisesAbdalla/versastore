import { useEffect } from "react";
import MainLayout from "../../../layouts/MainLayout";
import { TERMS_VERSION } from "../../../constants/terms";
import styles from "../styles.module.css";

// Conteúdo PROVISÓRIO (feature 007) — o texto legal definitivo entra no M8.
function Terms() {
  useEffect(() => {
    document.title = "Termos de Uso · Versa Store";
  }, []);

  return (
    <MainLayout>
      <div className={styles.page}>
        <p className={styles.provisional}>
          Documento provisório — o texto definitivo será publicado em breve.
        </p>

        <h1 className={styles.title}>Termos de Uso</h1>
        <p className={styles.version}>Versão {TERMS_VERSION}</p>

        <p className={styles.paragraph}>
          Ao usar a Versa Store, você concorda em fornecer informações verdadeiras no cadastro,
          utilizar a loja de forma lícita e respeitar os direitos de propriedade dos conteúdos aqui
          disponibilizados. Os produtos, preços e condições podem ser atualizados a qualquer momento.
        </p>

        <p className={styles.paragraph}>
          Este é um texto preliminar para viabilizar o cadastro. A versão completa dos Termos de Uso,
          incluindo condições de compra, trocas e responsabilidades, será disponibilizada nesta
          página.
        </p>
      </div>
    </MainLayout>
  );
}

export default Terms;
