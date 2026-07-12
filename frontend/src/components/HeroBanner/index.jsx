import styles from "./styles.module.css";
import heroImage from "../../assets/hero.png";
import { useHomeSettings } from "../../hooks/useHomeSettings";

function HeroBanner() {
  const { heroImage: customHero } = useHomeSettings();

  return (
    <section
      className={styles.hero}
      style={{ backgroundImage: `url(${customHero || heroImage})` }}
    >
      <div className={styles.overlay} />

      <div className={styles.content}>
        <span className={styles.tag}>
          Nova Coleção
        </span>

        <h1>
          Vista seu estilo
          <br />
          com a Versa Store
        </h1>

        <p>
          Produtos de alta qualidade com os melhores preços.
        </p>

        <button>
          Comprar Agora
        </button>
      </div>
    </section>
  );
}

export default HeroBanner;
