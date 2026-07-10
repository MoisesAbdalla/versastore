import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";

import db from "../firebase/firestore";

export async function createProduct(product) {
  const doc = {
    ...product,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, "products"),
    doc
  );

  return ref.id;
}

export async function getFeaturedProducts() {
  const featuredQuery = query(
    collection(db, "products"),
    where("destaque", "==", true)
  );

  const snapshot = await getDocs(featuredQuery);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export async function getProducts() {
  const snapshot = await getDocs(collection(db, "products"));

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export async function getProduct(id) {
  const snapshot = await getDoc(doc(db, "products", id));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function updateProduct(id, changes) {
  await updateDoc(doc(db, "products", id), changes);
}