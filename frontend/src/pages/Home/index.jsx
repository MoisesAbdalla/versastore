import styles from "./styles.module.css";
import MainLayout from "../../layouts/MainLayout";
import HeroBanner from "../../components/HeroBanner";
import Categories from "../../components/Categories";
import FeaturedProducts from "../../components/FeaturedProducts";

function Home() {
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