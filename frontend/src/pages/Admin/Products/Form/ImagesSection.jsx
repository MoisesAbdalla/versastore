import { useRef, useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CircularProgress from "@mui/material/CircularProgress";

import { uploadImageWithRetry } from "../../../../services/cloudinaryService";
import styles from "./styles.module.css";

let uploadKey = 0;

// Upload múltiplo com arrastar-e-soltar, estado individual por imagem e
// "tentar novamente" isolado (FR-024/FR-025): a falha de uma imagem nunca
// trava o formulário nem afeta as demais.
function ImagesSection({ images, onChange }) {
  const [pending, setPending] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function addImage(url) {
    onChange((current) => {
      const next = [...current, { url, isMain: current.length === 0 }];
      return next;
    });
  }

  async function startUpload(file, existingKey = null) {
    const key = existingKey ?? ++uploadKey;

    setPending((current) => [
      ...current.filter((item) => item.key !== key),
      { key, file, status: "uploading" },
    ]);

    try {
      const url = await uploadImageWithRetry(file);

      setPending((current) => current.filter((item) => item.key !== key));
      addImage(url);
    } catch (error) {
      setPending((current) =>
        current.map((item) =>
          item.key === key ? { ...item, status: "error", message: error.message } : item
        )
      );
    }
  }

  function handleFiles(fileList) {
    for (const file of [...fileList]) {
      startUpload(file);
    }
  }

  function removeImage(index) {
    onChange((current) => {
      const next = current.filter((_, i) => i !== index);

      if (next.length && !next.some((img) => img.isMain)) {
        next[0] = { ...next[0], isMain: true };
      }

      return next;
    });
  }

  function setMain(index) {
    onChange((current) => current.map((img, i) => ({ ...img, isMain: i === index })));
  }

  function move(index, delta) {
    onChange((current) => {
      const target = index + delta;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  }

  return (
    <div>
      <div
        className={dragOver ? `${styles.dropZone} ${styles.dropZoneActive}` : styles.dropZone}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            inputRef.current.click();
          }
        }}
        aria-label="Adicionar imagens"
      >
        <CloudUploadOutlinedIcon sx={{ fontSize: 40 }} />
        <p>Arraste imagens aqui ou clique para selecionar</p>
        <span>JPG, PNG ou WebP • até 5 MB cada</span>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(images.length > 0 || pending.length > 0) && (
        <ul className={styles.imageGrid}>
          {images.map((img, index) => (
            <li key={img.url} className={styles.imageItem}>
              <img src={img.url} alt={`Imagem ${index + 1}`} />

              <div className={styles.imageActions}>
                <IconButton
                  size="small"
                  onClick={() => setMain(index)}
                  aria-label={img.isMain ? "Imagem principal" : "Definir como principal"}
                  color={img.isMain ? "warning" : "default"}
                >
                  {img.isMain ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover para a esquerda">
                  <ArrowBackIcon fontSize="small" />
                </IconButton>

                <IconButton size="small" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label="Mover para a direita">
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>

                <IconButton size="small" onClick={() => removeImage(index)} aria-label="Remover imagem">
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </div>

              {img.isMain && <span className={styles.mainBadge}>Principal</span>}
            </li>
          ))}

          {pending.map((item) => (
            <li key={item.key} className={`${styles.imageItem} ${styles.imagePending}`}>
              {item.status === "uploading" ? (
                <div className={styles.uploadingState}>
                  <CircularProgress size={24} />
                  <span>Enviando…</span>
                </div>
              ) : (
                <div className={styles.errorState}>
                  <span className={styles.errorText}>{item.message || "Falha no envio."}</span>

                  <Button
                    size="small"
                    startIcon={<ReplayIcon />}
                    onClick={() => startUpload(item.file, item.key)}
                  >
                    Tentar novamente
                  </Button>

                  <Button
                    size="small"
                    color="inherit"
                    onClick={() =>
                      setPending((current) => current.filter((p) => p.key !== item.key))
                    }
                  >
                    Descartar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ImagesSection;
