import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from "firebase/auth";

import auth from "../firebase/auth";
import { ensureUserProfile, createCustomerProfile } from "./userService";
import { TERMS_VERSION } from "../constants/terms";

// Traduz códigos do Firebase Auth para mensagens/códigos de domínio pt-BR.
function authError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Cadastro por e-mail (feature 007): cria a conta, define o displayName e faz a
// escrita AUTORITATIVA do perfil (createCustomerProfile) — garante o nome mesmo
// com a corrida do onAuthStateChanged do AuthContext (I1 do analyze).
export async function register({ name, email, password, phone, termsAccepted }) {
  let response;

  try {
    response = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      throw authError("email-em-uso", "Este e-mail já está cadastrado.");
    }

    throw error;
  }

  await updateProfile(response.user, { displayName: name });

  await createCustomerProfile(response.user.uid, {
    name,
    email,
    phone,
    termsVersion: termsAccepted ? TERMS_VERSION : null,
  });

  return response.user;
}

export async function login(email, password) {
  const response = await signInWithEmailAndPassword(auth, email, password);

  return response.user;
}

// Login com Google (feature 007). Garante o doc do cliente com authProvider
// google; telefone/aceite ficam para o passo "Complete seu cadastro".
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const response = await signInWithPopup(auth, provider);

  await ensureUserProfile(response.user, { authProvider: "google" });

  return response.user;
}

// Recuperação de senha (feature 007): NUNCA lança para e-mail inexistente —
// resposta neutra que não revela se a conta existe (SC-005). Outros erros
// propagam para a UI oferecer "tentar novamente".
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-email") {
      return;
    }

    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}
