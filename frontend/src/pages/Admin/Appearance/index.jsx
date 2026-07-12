import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";

import { getHomeSettings, setHeroImage, setCategoryImage } from "../../../services/settingsService";
import { uploadImageWithRetry } from "../../../services/cloudinaryService";
import { useFeedback } from "../../../contexts/FeedbackContext";
import categories from "../../../data/categories";
import heroDefault from "../../../assets/hero.png";
import styles from "./styles.module.css";

// Aparência da Home (feature 004): troca das imagens do banner e das
// categorias da vitrine, com restauração do padrão embarcado.
function ImageSlot({ label, currentUrl, defaultImage, onUpload, onReset, wide = false }) {
  const [busy, setBusy] = useState(false);
  const { toastSuccess, toastError } = useFeedback();

  async function handleFile(file) {
    if (!file) {
      return;
    }

    setBusy(true);

    try {
      const url = await uploadImageWithRetry(file);

      await onUpload(url);
      toastSuccess(`Imagem de "${label}" atualizada. A Home já usa a nova imagem.`);
    } catch (error) {
      toastError(error.message || "Erro ao enviar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setBusy(true);

    try {
      await onReset();
      toastSuccess(`"${label}" voltou à imagem padrão.`);
    } catch (error) {
      toastError(error.message || "Erro ao restaurar o padrão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={wide ? `${styles.slot} ${styles.slotWide}` : styles.slot}>
      <img
        className={wide ? styles.previewWide : styles.preview}
        src={currentUrl || defaultImage}
        alt={`Imagem atual de ${label}`}
      />

      <div className={styles.slotInfo}>
        <span className={styles.slotLabel}>{label}</span>

        <span className={styles.slotStatus}>
          {currentUrl ? "Imagem personalizada" : "Imagem padrão"}
        </span>

        <div className={styles.slotActions}>
          <Button component="label" size="small" variant="outlined" disabled={busy}>
            {busy ? "Enviando…" : "Trocar imagem"}
            <input
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                handleFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </Button>

          {currentUrl && (
            <Button size="small" disabled={busy} onClick={handleReset}>
              Restaurar padrão
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AppearancePage() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(false);

  async function load() {
    setError(false);

    try {
      setSettings(await getHomeSettings());
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className={styles.errorState} role="alert">
        <p>Não foi possível carregar a aparência. Verifique sua conexão.</p>
        <Button variant="outlined" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Aparência da loja</h1>

      <p className={styles.hint}>
        As imagens abaixo aparecem na página inicial da loja. A mudança vale no próximo
        carregamento da Home. "Restaurar padrão" volta à imagem original do site.
      </p>

      {!settings ? (
        <Skeleton variant="rectangular" height={320} />
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Banner principal</h2>

            <ImageSlot
              wide
              label="Banner"
              currentUrl={settings.heroImage}
              defaultImage={heroDefault}
              onUpload={async (url) => {
                await setHeroImage(url);
                setSettings((s) => ({ ...s, heroImage: url }));
              }}
              onReset={async () => {
                await setHeroImage(null);
                setSettings((s) => ({ ...s, heroImage: null }));
              }}
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Categorias da Home</h2>

            <div className={styles.slotGrid}>
              {categories.map((category) => (
                <ImageSlot
                  key={category.key}
                  label={category.name}
                  currentUrl={settings.categoryImages[category.key] || null}
                  defaultImage={category.image}
                  onUpload={async (url) => {
                    await setCategoryImage(category.key, url);
                    setSettings((s) => ({
                      ...s,
                      categoryImages: { ...s.categoryImages, [category.key]: url },
                    }));
                  }}
                  onReset={async () => {
                    await setCategoryImage(category.key, null);
                    setSettings((s) => ({
                      ...s,
                      categoryImages: { ...s.categoryImages, [category.key]: null },
                    }));
                  }}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default AppearancePage;
