import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";

import db from "../firebase/firestore";
import { ROLES, roleHasPermission } from "../constants/roles";
import { TERMS_VERSION } from "../constants/terms";
import { normalizeForSearch } from "../utils/slugify";

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  const { role, name, email } = snapshot.data();

  return { role, name, email };
}

// Perfil completo do cliente (feature 007) — usado pelo AuthContext e telas de
// conta.
export async function getFullProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));

  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

// Garante o documento users/{uid} do usuário autenticado: cria como customer se
// não existir. `extra` permite marcar a origem (authProvider) e dados vindos do
// provedor (ex.: Google). Não sobrescreve doc existente.
export async function ensureUserProfile(user, extra = {}) {
  const existing = await getFullProfile(user.uid);

  if (existing) {
    return existing;
  }

  const profile = {
    name: user.displayName || "",
    nameLower: normalizeForSearch(user.displayName || ""),
    email: user.email,
    role: ROLES.CUSTOMER,
    phone: extra.phone || "",
    termsAcceptedAt: extra.termsAcceptedAt || null,
    termsVersion: extra.termsVersion || null,
    authProvider: extra.authProvider || "password",
    addresses: [],
    orderCount: 0,
    totalSpent: 0,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", user.uid), profile);

  return { id: user.uid, ...profile };
}

// Escrita AUTORITATIVA do perfil de um cliente recém-cadastrado por e-mail
// (feature 007, I1 do analyze). setDoc(merge) grava o doc completo — inclusive
// nome — independentemente da corrida com o `ensureUserProfile` do AuthContext,
// que pode criar um doc com `name: ""` antes. Só para cadastro NOVO (orderCount/
// totalSpent 0 são corretos para um cliente sem pedidos).
export async function createCustomerProfile(uid, { name, email, phone, termsAcceptedAt, termsVersion }) {
  await setDoc(
    doc(db, "users", uid),
    {
      name,
      nameLower: normalizeForSearch(name),
      email,
      role: ROLES.CUSTOMER,
      phone: phone || "",
      termsAcceptedAt: termsAcceptedAt || serverTimestamp(),
      termsVersion: termsVersion || null,
      authProvider: "password",
      addresses: [],
      orderCount: 0,
      totalSpent: 0,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// Re-aceite dos termos (feature 017/M8): registra o aceite da VERSÃO VIGENTE no
// próprio doc do usuário (permitido pelas rules — não toca role/agregados).
export async function acceptCurrentTerms(uid) {
  await updateDoc(doc(db, "users", uid), {
    termsVersion: TERMS_VERSION,
    termsAcceptedAt: serverTimestamp(),
  });
}

// Completa o cadastro (telefone + aceite) — usado no passo pós-Google.
export async function completeProfile(uid, { phone, termsVersion }) {
  await updateDoc(doc(db, "users", uid), {
    phone: phone || "",
    termsAcceptedAt: serverTimestamp(),
    termsVersion: termsVersion || null,
  });
}

// Edição dos dados pessoais na aba "Meus dados" (feature 007). Mantém o
// nameLower em sincronia (busca de clientes no admin) — o e-mail não é editável
// aqui porque é a credencial de login do Auth.
export async function updatePersonalData(uid, { name, phone }) {
  await updateDoc(doc(db, "users", uid), {
    name,
    nameLower: normalizeForSearch(name),
    phone: phone || "",
  });
}

// Salva o CPF no perfil (feature 009, opt-in "salvar para as próximas compras")
// — pré-preenche o checkout seguinte. Escrita do próprio usuário no próprio doc.
export async function saveCpf(uid, cpf) {
  await updateDoc(doc(db, "users", uid), { cpf: cpf || "" });
}

// Perfil completo quando tem telefone E aceite de termos (feature 007).
export function isProfileComplete(profile) {
  return Boolean(profile?.phone) && profile?.termsAcceptedAt != null;
}

// --- Endereços (users.addresses) — editados pelo próprio usuário -------------

export async function listAddresses(uid) {
  const profile = await getFullProfile(uid);

  return profile?.addresses || [];
}

// Marca `defaultId` como padrão e desmarca os demais (um só por vez).
function normalizeDefault(addresses, defaultId) {
  return addresses.map((a) => ({ ...a, isDefault: a.id === defaultId }));
}

export async function saveAddress(uid, address) {
  const current = await listAddresses(uid);
  const exists = current.some((a) => a.id === address.id);

  let next = exists
    ? current.map((a) => (a.id === address.id ? address : a))
    : [...current, address];

  // Se o endereço salvo é padrão, os demais deixam de ser.
  if (address.isDefault) {
    next = next.map((a) => ({ ...a, isDefault: a.id === address.id }));
  } else if (!next.some((a) => a.isDefault)) {
    // Sempre ao menos um padrão quando há endereços.
    next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
  }

  await updateDoc(doc(db, "users", uid), { addresses: next });
}

export async function removeAddress(uid, addressId) {
  const current = await listAddresses(uid);
  let next = current.filter((a) => a.id !== addressId);

  if (next.length > 0 && !next.some((a) => a.isDefault)) {
    next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
  }

  await updateDoc(doc(db, "users", uid), { addresses: next });
}

export async function setDefaultAddress(uid, addressId) {
  const current = await listAddresses(uid);
  const next = normalizeDefault(current, addressId);

  await updateDoc(doc(db, "users", uid), { addresses: next });
}

export function hasPermission(role, capability) {
  return roleHasPermission(role, capability);
}

// --- Lista de desejos (users.wishlist) — feature 014 -------------------------
// Guardada como array de productIds no doc do próprio usuário. As rules já
// permitem o usuário escrever no próprio doc (role/orderCount/totalSpent
// inalterados), então não há mudança de regras. arrayUnion/arrayRemove evitam
// corrida de leitura-escrita.

export async function addToWishlist(uid, productId) {
  await updateDoc(doc(db, "users", uid), { wishlist: arrayUnion(productId) });
}

export async function removeFromWishlist(uid, productId) {
  await updateDoc(doc(db, "users", uid), { wishlist: arrayRemove(productId) });
}
