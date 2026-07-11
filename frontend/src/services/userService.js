import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import db from "../firebase/firestore";
import { ROLES, roleHasPermission } from "../constants/roles";
import { normalizeForSearch } from "../utils/slugify";

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  const { role, name, email } = snapshot.data();

  return { role, name, email };
}

// Garante o documento users/{uid} do usuário autenticado: cria como customer se
// não existir (registro novo ou conta antiga anterior à coleção users). As rules
// só permitem o próprio usuário criar o doc com role "customer" — o papel admin
// é sempre atribuído por fora (bootstrap manual, quickstart §0).
export async function ensureUserProfile(user) {
  const existing = await getUserProfile(user.uid);

  if (existing) {
    return existing;
  }

  const profile = {
    name: user.displayName || "",
    nameLower: normalizeForSearch(user.displayName || ""),
    email: user.email,
    role: ROLES.CUSTOMER,
    addresses: [],
    orderCount: 0,
    totalSpent: 0,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", user.uid), profile);

  return { role: profile.role, name: profile.name, email: profile.email };
}

export function hasPermission(role, capability) {
  return roleHasPermission(role, capability);
}
