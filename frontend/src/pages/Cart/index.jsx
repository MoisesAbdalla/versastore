import { useEffect } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { useCart } from "../../contexts/CartContext";
import { formatBRL } from "../../utils/format";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

// Visão MÍNIMA do carrinho (feature 005, M1): lista itens em memória + subtotal
// e permite ajustar quantidade/remover. A página completa de carrinho e a
// persistência (localStorage) são do M2; o checkout é do M4.
function Cart() {
  const { items, subtotal, count, updateQty, removeItem } = useCart();

  useEffect(() => {
    document.title = "Carrinho · Versa Store";
  }, []);

  return (
    <MainLayout>
      <div className={styles.page}>
        <h1 className={styles.title}>Seu carrinho</h1>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>Seu carrinho está vazio.</p>
            <Link className={styles.ghostButton} to={ROUTES.PRODUCTS}>
              Ver o catálogo
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.lineId} className={styles.item}>
                  {item.imageUrl ? (
                    <img className={styles.thumb} src={item.imageUrl} alt={item.name} />
                  ) : (
                    <span className={styles.thumbFallback} aria-hidden="true" />
                  )}

                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.variationLabel && (
                      <span className={styles.itemVariation}>{item.variationLabel}</span>
                    )}
                    <span className={styles.itemPrice}>{formatBRL(item.unitPrice)}</span>
                  </div>

                  <div className={styles.qtyControls}>
                    <button
                      aria-label="Diminuir"
                      onClick={() => updateQty(item.lineId, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      aria-label="Aumentar"
                      disabled={item.quantity >= item.maxStock}
                      onClick={() => updateQty(item.lineId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  <span className={styles.lineTotal}>
                    {formatBRL(item.unitPrice * item.quantity)}
                  </span>

                  <button
                    className={styles.remove}
                    aria-label="Remover"
                    onClick={() => removeItem(item.lineId)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            <div className={styles.summary}>
              <span className={styles.subtotalLabel}>Subtotal ({count} itens)</span>
              <span className={styles.subtotalValue}>{formatBRL(subtotal)}</span>
            </div>

            <p className={styles.note}>
              O fechamento de compra (pagamento e frete) estará disponível em breve.
            </p>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default Cart;
