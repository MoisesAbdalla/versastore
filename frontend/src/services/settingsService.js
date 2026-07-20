import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import db from "../firebase/firestore";

// Aparência da Home (feature 004): documento único settings/home com as
// imagens customizadas do banner e das categorias da vitrine — e o
// ENQUADRAMENTO de cada uma (posição CSS: center, top, bottom left, …).
// Ausência de campo (ou do documento) = imagem padrão dos assets, centralizada.
//
// Shape: { heroImage, heroPosition, categoryImages: {key: url},
//          categoryPositions: {key: pos}, updatedAt }
// (keys estáveis definidas em data/categories.js)

const HOME_SETTINGS_REF = ["settings", "home"];

export const DEFAULT_IMAGE_POSITION = "center";

export async function getHomeSettings() {
  const snapshot = await getDoc(doc(db, ...HOME_SETTINGS_REF));

  if (!snapshot.exists()) {
    return {
      heroImage: null,
      heroPosition: DEFAULT_IMAGE_POSITION,
      categoryImages: {},
      categoryPositions: {},
    };
  }

  const data = snapshot.data();

  return {
    heroImage: data.heroImage || null,
    heroPosition: data.heroPosition || DEFAULT_IMAGE_POSITION,
    categoryImages: data.categoryImages || {},
    categoryPositions: data.categoryPositions || {},
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

export async function setHeroPosition(position) {
  await updateHomeSettings({ heroPosition: position || DEFAULT_IMAGE_POSITION });
}

export async function setCategoryPosition(key, position) {
  await updateHomeSettings({
    categoryPositions: { [key]: position || DEFAULT_IMAGE_POSITION },
  });
}

// --- Frete por tabela (feature 011 / M5a) --------------------------------
// Documento único settings/shipping com a tabela de frete. Leitura pública
// (checkout + banner), escrita admin — as rules de settings/{id} já cobrem.
// Shape: { rules: [{region, cepRanges:[{from,to}], price, etaDays,
//          minSubtotal?, maxSubtotal?}], defaultRule: {price, etaDays}|null,
//          freeShippingThreshold: number|null }

const SHIPPING_SETTINGS_REF = ["settings", "shipping"];

export async function getShippingSettings() {
  const snapshot = await getDoc(doc(db, ...SHIPPING_SETTINGS_REF));

  if (!snapshot.exists()) {
    return { rules: [], defaultRule: null, freeShippingThreshold: null, pickup: null };
  }

  const data = snapshot.data();

  return {
    rules: data.rules || [],
    defaultRule: data.defaultRule || null,
    freeShippingThreshold: data.freeShippingThreshold ?? null,
    // Retirada na loja (feature 016): { enabled, address } ou null (desligada).
    pickup: data.pickup || null,
  };
}

export async function updateShippingSettings(changes) {
  await setDoc(
    doc(db, ...SHIPPING_SETTINGS_REF),
    { ...changes, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// --- Dados da loja (feature 017 / M8) ------------------------------------
// Documento único settings/store com a identificação do fornecedor exibida no
// rodapé e no Contato (razão social, CNPJ, endereço, contatos). Leitura pública,
// escrita admin — as rules de settings/{id} já cobrem. Campos vazios = omitidos.

const STORE_SETTINGS_REF = ["settings", "store"];

const EMPTY_STORE = {
  razaoSocial: "",
  cnpj: "",
  endereco: "",
  email: "",
  telefone: "",
  whatsapp: "",
};

export async function getStoreSettings() {
  const snapshot = await getDoc(doc(db, ...STORE_SETTINGS_REF));

  if (!snapshot.exists()) {
    return { ...EMPTY_STORE };
  }

  const data = snapshot.data();

  return {
    razaoSocial: data.razaoSocial || "",
    cnpj: data.cnpj || "",
    endereco: data.endereco || "",
    email: data.email || "",
    telefone: data.telefone || "",
    whatsapp: data.whatsapp || "",
  };
}

export async function updateStoreSettings(changes) {
  await setDoc(
    doc(db, ...STORE_SETTINGS_REF),
    { ...changes, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// "Restaurar padrão" zera imagem E enquadramento em uma única escrita.
export async function resetHero() {
  await updateHomeSettings({ heroImage: null, heroPosition: null });
}

export async function resetCategory(key) {
  await updateHomeSettings({
    categoryImages: { [key]: null },
    categoryPositions: { [key]: null },
  });
}
