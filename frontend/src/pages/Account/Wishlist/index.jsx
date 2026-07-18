import { useEffect, useState } from "react";

import ProductCard from "../../../components/ProductCard";
import EmptyState from "../../../components/EmptyState";
import { useWishlist } from "../../../contexts/WishlistContext";
import { getPublicProduct } from "../../../services/productService";
import ROUTES from "../../../constants/routes";
import styles from "./styles.module.css";

// "Meus desejos" (feature 014): carrega os produtos salvos (users.wishlist) e os
// mostra em grade reusando o ProductCard — o coração preenchido remove da lista.
// Produtos removidos/inativos do catálogo simplesmente não aparecem (getPublic
// devolve null).
function AccountWishlist() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let active = true;

    if (ids.length === 0) {
      setProducts([]);
      return undefined;
    }

    Promise.all(ids.map((id) => getPublicProduct(id).catch(() => null))).then((list) => {
      if (active) {
        setProducts(list.filter(Boolean));
      }
    });

    return () => {
      active = false;
    };
  }, [ids]);

  if (products === null) {
    return <p className={styles.muted}>Carregando sua lista…</p>;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Sua lista de desejos está vazia"
        description="Toque no coração dos produtos para salvá-los aqui."
        actionLabel="Ver produtos"
        actionTo={ROUTES.PRODUCTS}
      />
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default AccountWishlist;
