import { collection, doc, getDocs, writeBatch } from "firebase/firestore";

import db from "../firebase/firestore";
import { buildSearchKeywords } from "../utils/searchKeywords";

// Backfill idempotente de `searchKeywords` (feature 005, T018). Produtos
// criados antes da vitrine não têm o campo — sem ele, não são encontrados por
// busca (mas continuam no catálogo). Recomputa com o MESMO gerador do write do
// admin; a 2ª execução não muda nada (idempotente).
//
// Executar em dev, logado como ADMIN, no console do navegador:
//   await backfillSearchKeywords()
export async function backfillSearchKeywords() {
  const snapshot = await getDocs(collection(db, "products"));
  const batch = writeBatch(db);

  let updated = 0;
  let skipped = 0;

  for (const productSnap of snapshot.docs) {
    const data = productSnap.data();
    const keywords = buildSearchKeywords(data.name, data.sku, data.categoryName || data.category);

    // Idempotência: só grava se o array mudou.
    const current = data.searchKeywords || [];
    const same =
      current.length === keywords.length && current.every((k, i) => k === keywords[i]);

    if (same) {
      skipped++;
      continue;
    }

    batch.update(doc(db, "products", productSnap.id), { searchKeywords: keywords });
    updated++;
  }

  if (updated > 0) {
    await batch.commit();
  }

  console.log(`Backfill de searchKeywords: ${updated} atualizado(s), ${skipped} já ok.`);

  return { updated, skipped };
}
