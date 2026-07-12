import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

import db from "../firebase/firestore";
import { PRODUCT_STATUS, DEFAULT_LOW_STOCK_THRESHOLD } from "../constants/product";
import { computeIncompleteFields } from "../services/productService";
import { normalizeForSearch } from "../utils/slugify";

// Backfill ONE-TIME de produtos legados (tasks.md T029a — resolve C2/C3 da
// análise): produtos criados antes da 003 não têm deleted/status/nameLower/
// totalStock e guardam preço em reais (float). Sem isto, where("deleted","==",
// false) não os encontra e a loja some com o catálogo.
//
// Como executar (dev, logado como ADMIN):
//   npm run dev → abrir o app → console do navegador → await backfillProducts()
// Rode ANTES de apertar a rule de leitura de products (T030a).
export async function backfillProducts() {
  const snapshot = await getDocs(collection(db, "products"));
  const batch = writeBatch(db);

  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Já normalizado (tem a flag deleted) — não tocar no preço; apenas
    // recalcula incomplete/incompleteFields com o MESMO critério do
    // productService (corrige flags gravadas pelo critério antigo).
    if (data.deleted !== undefined) {
      const fields = computeIncompleteFields(data);
      const incomplete = fields.length > 0;

      if (
        data.incomplete !== incomplete ||
        JSON.stringify(data.incompleteFields || null) !== JSON.stringify(fields)
      ) {
        batch.update(doc(db, "products", docSnap.id), {
          incomplete,
          incompleteFields: fields,
        });
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    const stock = Number(data.stock) || 0;
    const price = Number(data.price) || 0;
    const incompleteFields = computeIncompleteFields({
      ...data,
      price: Math.round(price * 100),
      stock,
    });

    batch.update(doc(db, "products", docSnap.id), {
      deleted: false,
      deletedAt: null,
      status: PRODUCT_STATUS.ATIVO,
      nameLower: normalizeForSearch(data.name || ""),
      skuUpper: "",
      descriptionText: (data.description || "").trim(),
      totalStock: stock,
      lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
      variations: [],
      variationSkus: [],
      images: data.image ? [{ url: data.image, isMain: true }] : [],
      categoryName: data.category || "",
      // Preço legado em reais (ex.: 199.9) → centavos (19990).
      price: Math.round(price * 100),
      destaque: Boolean(data.destaque),
      incomplete: incompleteFields.length > 0,
      incompleteFields,
    });

    updated++;
  }

  if (updated > 0) {
    await batch.commit();
  }

  console.log(`Backfill concluído: ${updated} produto(s) normalizado(s), ${skipped} já ok.`);

  return { updated, skipped };
}
