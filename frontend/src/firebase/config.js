import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyANIRO8ltSvkKsuDhHK9krH_AfJ5a-DzX8",
  authDomain: "versa-store-2eb1a.firebaseapp.com",
  projectId: "versa-store-2eb1a",
  storageBucket: "versa-store-2eb1a.firebasestorage.app",
  messagingSenderId: "238438731156",
  appId: "1:238438731156:web:f0a124f5fa684106f11381",
  measurementId: "G-D0ER9QSZ1T",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;