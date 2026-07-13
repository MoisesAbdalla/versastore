import { effectivePrice } from "../../utils/promo";
import { formatBRL } from "../../utils/format";
import styles from "./styles.module.css";

// Preço da vitrine (feature 005). Quando há promoção vigente (promo.js, fuso
// de Brasília), mostra o preço normal riscado + o promocional em destaque + o
// percentual de desconto. Usado no card e na página de produto.
function PriceTag({ product, size = "md" }) {
  const { price, isPromo, originalPrice, discountPct } = effectivePrice(product);

  return (
    <div className={size === "lg" ? `${styles.priceTag} ${styles.lg}` : styles.priceTag}>
      {isPromo && (
        <span className={styles.original}>{formatBRL(originalPrice)}</span>
      )}

      <span className={isPromo ? styles.promo : styles.current}>{formatBRL(price)}</span>

      {isPromo && discountPct > 0 && (
        <span className={styles.discount}>-{discountPct}%</span>
      )}
    </div>
  );
}

export default PriceTag;
