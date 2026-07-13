import { useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";

import { cloudinaryUrl, IMAGE_WIDTHS } from "../../services/cloudinaryService";
import styles from "./styles.module.css";

// Galeria da página de produto (feature 005, D6/R-3). Sem dependência de zoom:
// desktop usa lupa (background-position seguindo o cursor sobre a imagem de
// resolução maior); mobile abre um modal com a imagem grande, onde o
// pinch-to-zoom nativo do navegador funciona.
function ProductGallery({ images, name }) {
  const list = images && images.length ? images : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [lens, setLens] = useState(null); // {x%, y%} da posição do cursor
  const frameRef = useRef(null);

  const active = list[activeIndex];
  const mainUrl = active ? cloudinaryUrl(active.url, { w: IMAGE_WIDTHS.main }) : "";
  const zoomUrl = active ? cloudinaryUrl(active.url, { w: IMAGE_WIDTHS.zoom }) : "";

  function handleMove(e) {
    const rect = frameRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setLens({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  if (!active) {
    return (
      <div className={styles.gallery}>
        <div className={styles.fallback} aria-hidden="true">
          <span>VS</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <div
        ref={frameRef}
        className={styles.mainFrame}
        onMouseMove={handleMove}
        onMouseLeave={() => setLens(null)}
        onClick={() => setZoomOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setZoomOpen(true);
          }
        }}
        aria-label="Ampliar imagem"
        style={
          lens
            ? {
                backgroundImage: `url(${zoomUrl})`,
                backgroundSize: "200%",
                backgroundPosition: `${lens.x}% ${lens.y}%`,
              }
            : undefined
        }
      >
        {!lens && <img src={mainUrl} alt={name} className={styles.mainImage} />}
      </div>

      {list.length > 1 && (
        <ul className={styles.thumbs}>
          {list.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                className={index === activeIndex ? `${styles.thumb} ${styles.thumbActive}` : styles.thumb}
                onClick={() => setActiveIndex(index)}
                aria-label={`Imagem ${index + 1}`}
              >
                <img src={cloudinaryUrl(image.url, { w: IMAGE_WIDTHS.thumb })} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={zoomOpen} onClose={() => setZoomOpen(false)} maxWidth="lg">
        <img src={zoomUrl} alt={name} className={styles.zoomImage} />
      </Dialog>
    </div>
  );
}

export default ProductGallery;
