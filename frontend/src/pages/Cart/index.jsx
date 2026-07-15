import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { useCart } from "../../contexts/CartContext";
import { formatBRL } from "../../utils/format";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

// Mensagem amigável para cada tipo de mudança detectada na revalidação (M2).
function changeMessage(change) {
  switch (change.type) {
    case "indisponivel":
      return `"${change.name}" saiu do catálogo e foi removido do carrinho.`;
    case "esgotado":
      return `"${change.name}" esgotou e foi removido do carrinho.`;
    case "quantidade":
      return `A quantidade de "${change.name}" foi ajustada para ${change.to} (estoque disponível).`;
    case "preco":
      return `O preço de "${change.name}" foi atualizado.`;
    default:
      return null;
  }
}

function Cart() {
  const { items, subtotal, count, updateQty, removeItem, revalidate } = useCart();

  const [revalidating, setRevalidating] = useState(true);
  const [changes, setChanges] = useState([]);

  useEffect(() => {
    document.title = "Carrinho · Versa Store";
  }, []);

  // Revalida contra o Firestore ao abrir o carrinho (uma vez): ajusta
  // preço/estoque, remove indisponíveis e sinaliza o que mudou.
  useEffect(() => {
    let cancelled = false;

    revalidate()
      .then((result) => {
        if (!cancelled) {
          setChanges(result);
        }
      })
      .catch(() => {
        // Falha de rede na revalidação: mantém o carrinho salvo como está,
        // sem bloquear o cliente (o checkout do M4 revalida de novo).
      })
      .finally(() => {
        if (!cancelled) {
          setRevalidating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revalidate]);

  return (
    <MainLayout>
      <div className={styles.page}>
        <h1 className={styles.title}>Seu carrinho</h1>

        {changes.length > 0 && (
          <div className={styles.notice} role="status">
            <p className={styles.noticeTitle}>Alguns itens foram atualizados:</p>
            <ul className={styles.noticeList}>
              {changes.map((change, index) => (
                <li key={index}>{changeMessage(change)}</li>
              ))}
            </ul>
          </div>
        )}

        {revalidating && items.length > 0 && (
          <p className={styles.revalidating}>Atualizando seu carrinho…</p>
        )}

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>{revalidating ? "Carregando…" : "Seu carrinho está vazio."}</p>
            {!revalidating && (
              <Link className={styles.ghostButton} to={ROUTES.PRODUCTS}>
                Ver o catálogo
              </Link>
            )}
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

            <div className={styles.checkoutRow}>
              <Link className={styles.checkout} to={ROUTES.CHECKOUT}>
                Finalizar compra
              </Link>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default Cart;
