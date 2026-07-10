import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { getFeaturedProducts } from "../../services/productService";
import ProductCard from "../ProductCard";

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function FeaturedProducts() {
  const trackRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getFeaturedProducts()
      .then((result) => {
        if (!cancelled) setProducts(shuffle(result));
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function checkOverflow() {
      const track = trackRef.current;
      if (!track) return;
      setShowControls(track.scrollWidth > track.clientWidth + 1);
    }

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [products]);

  function scrollByDirection(direction) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: track.clientWidth * 0.9 * direction, behavior: "smooth" });
  }

  const isEmpty = loaded && products.length === 0;

  return (
    <section id="produtos-destaque" className={styles.section}>
      <h2>Produtos em Destaque</h2>

      {isEmpty ? (
        <p className={styles.empty}>Em breve novos produtos em destaque.</p>
      ) : (
        <div className={styles.carousel}>
          {showControls && (
            <button
              type="button"
              className={styles.navButton}
              onClick={() => scrollByDirection(-1)}
              aria-label="Produto anterior"
            >
              <ChevronLeftIcon />
            </button>
          )}

          <div className={styles.track} ref={trackRef}>
            {products.map((product) => (
              <div className={styles.slide} key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {showControls && (
            <button
              type="button"
              className={styles.navButton}
              onClick={() => scrollByDirection(1)}
              aria-label="Próximo produto"
            >
              <ChevronRightIcon />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default FeaturedProducts;