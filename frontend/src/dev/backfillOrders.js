import { collection, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";

import db from "../firebase/firestore";
import { normalizeForSearch } from "../utils/slugify";

function nameFromEmail(email) {
  const localPart = (email || "cliente").split("@")[0];

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Backfill one-time dos pedidos existentes (bugfix da busca por cliente):
// - grava customerEmailLower (novo campo de busca por prefixo);
// - preenche customerName/customerNameLower vazios a partir do doc do usuário
//   (ou do e-mail), para a busca encontrar o que a coluna exibe.
// Executar em dev, logado como ADMIN: await backfillOrders()
export async function backfillOrders() {
  const snapshot = await getDocs(collection(db, "orders"));
  const batch = writeBatch(db);

  let updated = 0;
  let skipped = 0;

  for (const orderSnap of snapshot.docs) {
    const order = orderSnap.data();
    const changes = {};

    if (order.customerEmailLower === undefined) {
      changes.customerEmailLower = normalizeForSearch(order.customerEmail || "");
    }

    if (!order.customerName) {
      let name = "";

      if (order.customerId) {
        const userSnap = await getDoc(doc(db, "users", order.customerId));

        name = userSnap.exists() ? userSnap.data().name || "" : "";
      }

      if (!name) {
        name = nameFromEmail(order.customerEmail);
      }

      changes.customerName = name;
      changes.customerNameLower = normalizeForSearch(name);
    }

    if (Object.keys(changes).length === 0) {
      skipped++;
      continue;
    }

    batch.update(doc(db, "orders", orderSnap.id), changes);
    updated++;
  }

  if (updated > 0) {
    await batch.commit();
  }

  console.log(`Backfill de pedidos concluído: ${updated} atualizado(s), ${skipped} já ok.`);

  return { updated, skipped };
}
