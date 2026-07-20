import MainLayout from "../../layouts/MainLayout";
import { useStoreSettings } from "../../hooks/useStoreSettings";
import { usePageMeta } from "../../hooks/usePageMeta";
import styles from "./styles.module.css";

// Página institucional "Quem somos" (feature 017 / M8).
function About() {
  const store = useStoreSettings();

  usePageMeta({
    title: "Quem somos",
    description:
      "Conheça a Versa Store: uma loja online construída sobre qualidade, tecnologia e confiança.",
  });

  return (
    <MainLayout>
      <div className={styles.page}>
        <h1 className={styles.title}>Quem somos</h1>

        <p className={styles.paragraph}>
          A <strong>Versa Store</strong> nasceu para unir três coisas que acreditamos serem
          inseparáveis numa boa experiência de compra: <strong>qualidade</strong> nos produtos,
          <strong> tecnologia</strong> na experiência e <strong>confiança</strong> em cada etapa —
          do clique à entrega.
        </p>

        <p className={styles.paragraph}>
          Nosso catálogo é selecionado com curadoria e cada pedido é acompanhado de perto: você vê
          o status em tempo real na sua conta, escolhe entre receber em casa ou retirar na loja, e
          conta com uma política de trocas transparente — incluindo o direito de arrependimento de
          7 dias garantido por lei.
        </p>

        <p className={styles.paragraph}>
          As avaliações publicadas na loja vêm de clientes que realmente compraram os produtos, e
          os seus dados são tratados com o cuidado exigido pela LGPD. Vender bem, para nós, é
          construir uma relação que dure mais que um pedido.
        </p>

        {(store.razaoSocial || store.cnpj || store.endereco) && (
          <div className={styles.company}>
            {store.razaoSocial && <span>{store.razaoSocial}</span>}
            {store.cnpj && <span>CNPJ {store.cnpj}</span>}
            {store.endereco && <span>{store.endereco}</span>}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default About;
