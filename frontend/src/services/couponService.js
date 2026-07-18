import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import db from "../firebase/firestore";
import { COUPON_TYPE } from "../constants/coupon";
import { normalizeCode, validateCouponInput } from "../utils/coupon";

// Cupons de desconto (feature 013). Coleção `coupons` com doc id = código
// normalizado: o cliente lê UM cupom por código (get) sem enumerar todos
// (list é admin). Escrita é admin (as rules cobrem). O incremento de usedCount
// vive no orderService (transição para `pago`).

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function listCoupons() {
  const snapshot = await getDocs(query(collection(db, "coupons"), orderBy("createdAt", "desc")));

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCoupon(code) {
  const id = normalizeCode(code);

  if (!id) {
    return null;
  }

  const snapshot = await getDoc(doc(db, "coupons", id));

  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

// Cria um cupom novo. Normaliza o código, valida os campos e garante unicidade
// (o código é o id — não pode sobrescrever um existente).
export async function createCoupon(form) {
  const code = normalizeCode(form.code);
  const check = validateCouponInput({ ...form, code });

  if (!check.ok) {
    throw serviceError("invalido", "Cupom inválido. Revise os campos.");
  }

  const existing = await getDoc(doc(db, "coupons", code));

  if (existing.exists()) {
    throw serviceError("codigo-duplicado", "Já existe um cupom com esse código.");
  }

  const data = {
    code,
    type: form.type,
    value: form.type === COUPON_TYPE.FRETE_GRATIS ? 0 : form.value || 0,
    minSubtotal: form.minSubtotal ?? null,
    startAt: form.startAt ?? null,
    endAt: form.endAt ?? null,
    maxUses: form.maxUses ?? null,
    usedCount: 0,
    active: form.active !== false,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "coupons", code), data);

  return { id: code, ...data };
}

// Edita um cupom existente (o código/id é imutável — não vem em `changes`).
export async function updateCoupon(code, changes) {
  await updateDoc(doc(db, "coupons", normalizeCode(code)), changes);
}

export async function deleteCoupon(code) {
  await deleteDoc(doc(db, "coupons", normalizeCode(code)));
}

export async function toggleCouponActive(code, active) {
  await updateDoc(doc(db, "coupons", normalizeCode(code)), { active });
}
