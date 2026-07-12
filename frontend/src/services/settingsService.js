import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import db from "../firebase/firestore";

// Aparência da Home (feature 004): documento único settings/home com as
// imagens customizadas do banner e das categorias da vitrine. Ausência de
// campo (ou do documento) = a loja usa a imagem padrão embarcada nos assets.
//
// Shape: { heroImage: url|null, categoryImages: { [key]: url|null }, updatedAt }
// (keys estáveis definidas em data/categories.js)

const HOME_SETTINGS_REF = ["settings", "home"];

export async function getHomeSettings() {
  const snapshot = await getDoc(doc(db, ...HOME_SETTINGS_REF));

  if (!snapshot.exists()) {
    return { heroImage: null, categoryImages: {} };
  }

  const data = snapshot.data();

  return {
    heroImage: data.heroImage || null,
    categoryImages: data.categoryImages || {},
  };
}

// setDoc com merge: atualizações parciais nunca apagam as demais imagens.
export async function updateHomeSettings(changes) {
  await setDoc(
    doc(db, ...HOME_SETTINGS_REF),
    { ...changes, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function setHeroImage(url) {
  await updateHomeSettings({ heroImage: url || null });
}

export async function setCategoryImage(key, url) {
  await updateHomeSettings({ categoryImages: { [key]: url || null } });
}
