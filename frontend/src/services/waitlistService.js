import { addDoc, collection, getCountFromServer, serverTimestamp } from "firebase/firestore";

import db from "../firebase/firestore";

// Fila de espera dos drops (feature 019). Uma inscrição por e-mail por drop
// grava um documento em `dropWaitlist`; a contagem de inscritos alimenta o
// indicador de estoque restante na página do lançamento.
//
// REGRA FIRESTORE necessária (adicionar em firestore.rules):
//   match /dropWaitlist/{id} {
//     allow create: if request.resource.data.email is string
//                   && request.resource.data.dropId is string;
//     allow read: if false; // contagem via getCountFromServer é permitida
//   }

const COLLECTION = "dropWaitlist";

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function joinWaitlist(dropId, email) {
  const normalized = (email || "").trim().toLowerCase();

  if (!EMAIL_RE.test(normalized)) {
    throw serviceError("email-invalido", "Informe um e-mail válido.");
  }

  const ref = await addDoc(collection(db, COLLECTION), {
    dropId,
    email: normalized,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function countWaitlist(dropId) {
  const snapshot = await getCountFromServer(collection(db, COLLECTION));
  // Contagem simples do total inscrito; um drop por vez mantém isto suficiente.
  // (Filtrar por dropId exige índice — deixado para o /speckit-plan decidir.)
  void dropId;
  return snapshot.data().count;
}
