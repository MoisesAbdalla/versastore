import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import StarBorderIcon from "@mui/icons-material/StarBorder";

import { starBreakdown } from "../../utils/rating";
import styles from "./styles.module.css";

const ICONS = { full: StarIcon, half: StarHalfIcon, empty: StarBorderIcon };

// Exibe a média em 5 estrelas (cheia/meia/vazia) + contagem opcional (feature
// 015). Reutilizado no card da vitrine e na página do produto.
function StarRating({ avg = 0, count = 0, size = "md", showCount = false }) {
  const stars = starBreakdown(avg);
  const label = count > 0 ? `Média ${avg} de 5, ${count} avaliações` : "Sem avaliações";

  return (
    <span className={`${styles.wrap} ${styles[size] || ""}`} role="img" aria-label={label}>
      <span className={styles.stars} aria-hidden="true">
        {stars.map((kind, i) => {
          const Icon = ICONS[kind];
          return (
            <Icon
              key={i}
              fontSize="inherit"
              className={kind === "empty" ? styles.empty : styles.filled}
            />
          );
        })}
      </span>
      {showCount && (
        <span className={styles.count}>{count > 0 ? `(${count})` : "Sem avaliações"}</span>
      )}
    </span>
  );
}

export default StarRating;
