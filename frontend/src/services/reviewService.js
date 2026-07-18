import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from "firebase/firestore";

import db from "../firebase/firestore";
import { REVIEW_STATUS } from "../constants/review";
import { ORDER_STATUS } from "../constants/orderStatus";
import { averageOf } from "../utils/rating";

// Avaliações de produtos (feature 015). Coleção `reviews` com id determinístico
// `productId_uid` (1 por produto/cliente). O cliente escreve só a própria como
// PENDENTE; a leitura pública é só das aprovadas; a moderação e a média
// denormalizada do produto são escrita ADMIN (o cliente não forja a média).

const PAGE_SIZE = 10;

export function reviewId(productId, uid) {
  return `${productId}_${uid}`;
}

// --- Cliente ---------------------------------------------------------------

// Cria/edita a própria avaliação — sempre volta a PENDENTE (re-moderação).
export async function submitReview({ productId, uid, userName, rating, comment }) {
  const ref = doc(db, "reviews", reviewId(productId, uid));
  const snap = await getDoc(ref);

  const data = {
    productId,
    userId: uid,
    userName: userName || "",
    rating,
    comment: (comment || "").trim(),
    status: REVIEW_STATUS.PENDENTE,
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    data.createdAt = serverTimestamp();
  }

  await setDoc(ref, data, { merge: true });
}

export async function getMyReview(productId, uid) {
  if (!uid) {
    return null;
  }

  const snap = await getDoc(doc(db, "reviews", reviewId(productId, uid)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Avaliações aprovadas de um produto, paginadas (cursor = último doc).
export async function getApprovedReviews(productId, { pageSize = PAGE_SIZE, cursor = null } = {}) {
  const constraints = [
    where("productId", "==", productId),
    where("status", "==", REVIEW_STATUS.APROVADA),
    orderBy("createdAt", "desc"),
  ];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(collection(db, "reviews"), ...constraints));
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    items: docs.map((d) => ({ id: d.id, ...d.data() })),
    nextCursor: docs.length ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
}

// Elegibilidade "comprou": um pedido não cancelado do cliente contendo o produto.
export async function hasPurchased(uid, productId) {
  if (!uid) {
    return false;
  }

  const snapshot = await getDocs(
    query(
      collection(db, "orders"),
      where("customerId", "==", uid),
      where("productIds", "array-contains", productId),
      limit(10)
    )
  );

  return snapshot.docs.some((d) => d.data().status !== ORDER_STATUS.CANCELADO);
}

// --- Admin (moderação) -----------------------------------------------------

export async function listReviews({ status = REVIEW_STATUS.PENDENTE } = {}) {
  const snapshot = await getDocs(query(collection(db, "reviews"), where("status", "==", status)));

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export async function approveReview(id) {
  await moderate(id, REVIEW_STATUS.APROVADA);
}

export async function hideReview(id) {
  await moderate(id, REVIEW_STATUS.OCULTA);
}

async function moderate(id, status) {
  const ref = doc(db, "reviews", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return;
  }

  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
  await recomputeProductRating(snap.data().productId);
}

export async function deleteReview(id) {
  const ref = doc(db, "reviews", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return;
  }

  const { productId } = snap.data();
  await deleteDoc(ref);
  await recomputeProductRating(productId);
}

// Recalcula ratingAvg/ratingCount do produto a partir das avaliações APROVADAS.
// Escrita ADMIN (as rules de products já cobrem) — a média não é forjável.
export async function recomputeProductRating(productId) {
  const snapshot = await getDocs(
    query(
      collection(db, "reviews"),
      where("productId", "==", productId),
      where("status", "==", REVIEW_STATUS.APROVADA)
    )
  );

  const approved = snapshot.docs.map((d) => d.data());

  await updateDoc(doc(db, "products", productId), {
    ratingAvg: averageOf(approved),
    ratingCount: approved.length,
  });
}
