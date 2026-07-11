import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import auth from "../firebase/auth";
import { signOut } from "firebase/auth";
import { ensureUserProfile } from "./userService";

export async function register(email, password) {
  const response = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // Cria o documento users/{uid} (role "customer") — base do controle de
  // acesso do painel e do módulo de clientes (specs/003, data-model.md).
  await ensureUserProfile(response.user);

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