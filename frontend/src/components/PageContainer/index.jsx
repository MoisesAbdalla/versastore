import styles from "./styles.module.css";

// Container padrão das páginas da loja (mesmo eixo/largura em todo o site).
// Fonte única do max-width + padding + centralização — reutilizado pelo
// catálogo e pela área de conta para que os eixos nunca divirjam.
function PageContainer({ children, className = "" }) {
  return <div className={`${styles.container} ${className}`.trim()}>{children}</div>;
}

export default PageContainer;
