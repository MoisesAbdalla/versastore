import styles from "./styles.module.css";
import MainLayout from "../../layouts/MainLayout";
import HeroBanner from "../../components/HeroBanner";
import Categories from "../../components/Categories";
import FeaturedProducts from "../../components/FeaturedProducts";
import { usePageMeta } from "../../hooks/usePageMeta";

function Home() {
  usePageMeta({
    description:
      "Versa Store — sua loja online com qualidade, tecnologia e confiança. Frete para todo o Brasil e retirada na loja.",
  });

  return (
    <MainLayout>
      <HeroBanner />
      <div className={styles.sections}>
        <Categories />
        <FeaturedProducts />
      </div>
    </MainLayout>
  );
}

export default Home;