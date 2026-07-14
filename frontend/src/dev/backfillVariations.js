import { collection, doc, getDocs, writeBatch } from "firebase/firestore";

import db from "../firebase/firestore";
import { deriveAttributesFromVariations, validateVariations } from "../utils/variationValidation";

// Migração das variações para o modelo por atributo (feature 008, US3).
// IDEMPOTENTE (padrão do backfillSearchKeywords): só grava o que mudou; a 2ª
// execução é no-op. Por produto:
//   - deriva `attributes` (nome + valores ordenados por 1ª aparição) das
//     chaves preenchidas em TODAS as variações;
//   - produtos cujas variações DISCORDAM são SINALIZADOS para revisão manual
//     (variationsInconsistent + variationIssues) sem alterar as variações —
//     nunca adivinha/inventa valores (FR-015);
//   - produto sem variação fica attributes: [] (simples, consistente).
// O campo variationsInconsistent precisa existir em TODOS os docs antes de a
// vitrine filtrar por ele (== false também exclui campo ausente).
//
// Executar em dev, logado como ADMIN, no console do navegador:
//   await backfillVariations()
// Saída: { updated, flagged, skipped } — flagged = produtos p/ corrigir no admin.
export async function backfillVariations() {
  const snapshot = await getDocs(collection(db, "products"));
  const batch = writeBatch(db);

  let updated = 0;
  let flagged = 0;
  let skipped = 0;

  for (const productSnap of snapshot.docs) {
    const data = productSnap.data();
    const variations = data.variations || [];
    const derived = deriveAttributesFromVariations(variations);

    let attributes;
    let inconsistent;
    let issues;

    if (derived.inconsistent) {
      // Sinaliza sem alterar: mantém attributes/variações como estão.
      attributes = data.attributes;
      inconsistent = true;
      issues = derived.issues;
    } else {
      // Consistente: usa os attributes já declarados (modelo novo) ou os
      // derivados; valida com a MESMA regra do save do admin (pega também
      // combinação duplicada e valor fora da lista).
      attributes = Array.isArray(data.attributes) && data.attributes.length
        ? data.attributes
        : derived.attributes;

      const check = validateVariations({ attributes, variations });
      inconsistent = !check.ok;
      issues = check.issues;
    }

    if (inconsistent) {
      flagged++;
    }

    const changes = {};

    if (attributes !== undefined && JSON.stringify(data.attributes) !== JSON.stringify(attributes)) {
      changes.attributes = attributes;
    }

    if (data.variationsInconsistent !== inconsistent) {
      changes.variationsInconsistent = inconsistent;
    }

    if (JSON.stringify(data.variationIssues || []) !== JSON.stringify(issues)) {
      changes.variationIssues = issues;
    }

    // Idempotência: só grava se algo mudou.
    if (Object.keys(changes).length === 0) {
      skipped++;
      continue;
    }

    batch.update(doc(db, "products", productSnap.id), changes);
    updated++;
  }

  if (updated > 0) {
    await batch.commit();
  }

  console.log(
    `Backfill de variações: ${updated} atualizado(s), ${flagged} sinalizado(s) p/ revisão, ${skipped} já ok.`
  );

  return { updated, flagged, skipped };
}
