import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import auth from "../firebase/auth";
import { signOut } from "firebase/auth";

export async function register(email, password) {
  const response = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  return response.user;
}

export async function login(email, password) {
  const response = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return response.user;
}

export async function logout() {
  await signOut(auth);
}