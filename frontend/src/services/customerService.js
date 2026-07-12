import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

import db from "../firebase/firestore";
import { ROLES } from "../constants/roles";
import { normalizeForSearch } from "../utils/slugify";

const PAGE_SIZE = 20;

// Ordenações restritas às combinações indexadas (role + campo — R-8).
const SORTABLE_FIELDS = ["createdAt", "nameLower", "totalSpent"];

const PREFIX_END = String.fromCharCode(0xf8ff);

function toItem(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

// Módulo Clientes lista a coleção única `users` filtrada por papel (R-15).
// Busca cobre o que as colunas exibem: prefixo de nome E de e-mail, mesclados
// por id (mesmo padrão de produtos/pedidos, R-5); sem paginação na busca.
export async function listCustomers({
  search = "",
  sort = null,
  pageSize = PAGE_SIZE,
  cursor = null,
} = {}) {
  const col = collection(db, "users");

  if (search.trim()) {
    const term = normalizeForSearch(search);

    const [byName, byEmail] = await Promise.all([
      getDocs(
        query(
          col,
          where("role", "==", ROLES.CUSTOMER),
          where("nameLower", ">=", term),
          where("nameLower", "<=", term + PREFIX_END),
          limit(pageSize)
        )
      ),
      getDocs(
        query(
          col,
          where("role", "==", ROLES.CUSTOMER),
          where("email", ">=", term),
          where("email", "<=", term + PREFIX_END),
          limit(pageSize)
        )
      ),
    ]);

    const merged = new Map();

    for (const docSnap of [...byName.docs, ...byEmail.docs]) {
      merged.set(docSnap.id, toItem(docSnap));
    }

    return { items: [...merged.values()].slice(0, pageSize), nextCursor: null, hasMore: false };
  }

  const constraints = [where("role", "==", ROLES.CUSTOMER)];

  const sortKey = sort && SORTABLE_FIELDS.includes(sort.key) ? sort.key : "createdAt";
  const sortDir = sort?.direction === "asc" ? "asc" : "desc";

  constraints.push(orderBy(sortKey, sortDir));

  let cursorSnap = cursor;

  if (typeof cursor === "string") {
    cursorSnap = await getDoc(doc(db, "users", cursor));

    if (!cursorSnap.exists()) {
      cursorSnap = null;
    }
  }

  if (cursorSnap) {
    constraints.push(startAfter(cursorSnap));
  }

  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(col, ...constraints));
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    items: docs.map(toItem),
    nextCursor: docs.length ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
}

export async function getCustomer(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));

  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

// Histórico de pedidos do cliente (índice customerId + createdAt DESC).
export async function getCustomerOrders(uid, { pageSize = PAGE_SIZE, cursor = null } = {}) {
  const constraints = [
    where("customerId", "==", uid),
    orderBy("createdAt", "desc"),
  ];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(collection(db, "orders"), ...constraints));
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    items: docs.map(toItem),
    nextCursor: docs.length ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
}
