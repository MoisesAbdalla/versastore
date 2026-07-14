import styles from "./styles.module.css";

// Container padrão das páginas da loja (mesmo eixo/padding/centralização).
// `narrow` reduz o max-width para áreas majoritariamente de formulário (conta),
// onde 1200px deixaria campos largos demais e conteúdo empurrado à esquerda; o
// padrão (1200px) fica para catálogo/produto, que usam a largura de verdade.
function PageContainer({ children, className = "", narrow = false }) {
  const classes = [styles.container, narrow && styles.narrow, className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

export default PageContainer;
