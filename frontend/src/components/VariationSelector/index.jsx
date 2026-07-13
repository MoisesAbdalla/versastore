import { useMemo } from "react";

import styles from "./styles.module.css";

// Seletor de variação por atributo (feature 005, FR-008). Deriva os atributos
// (ex.: tamanho, cor) das variações e, para cada valor, resolve a variação
// correspondente. Combinações sem estoque são desabilitadas/sinalizadas.
//
// Modelo do M1: as variações são uma lista plana com attributes; o seletor
// oferece as variações diretamente quando há um único atributo, e combina
// atributos quando há mais de um.
function VariationSelector({ variations, selectedId, onSelect }) {
  const attributeKeys = useMemo(() => {
    const keys = new Set();

    for (const variation of variations) {
      for (const key of Object.keys(variation.attributes || {})) {
        keys.add(key);
      }
    }

    return [...keys];
  }, [variations]);

  // Caso simples e comum: cada variação é uma opção única (um "chip" por
  // variação, rotulada pela combinação dos seus atributos).
  return (
    <div className={styles.selector}>
      <span className={styles.label}>
        {attributeKeys.length ? attributeKeys.join(" / ") : "Variação"}
      </span>

      <div className={styles.options}>
        {variations.map((variation) => {
          const soldOut = (variation.stock ?? 0) === 0;
          const label =
            Object.values(variation.attributes || {}).filter(Boolean).join(" / ") ||
            variation.sku ||
            "Única";

          return (
            <button
              key={variation.id}
              type="button"
              disabled={soldOut}
              aria-pressed={selectedId === variation.id}
              className={[
                styles.option,
                selectedId === variation.id ? styles.selected : "",
                soldOut ? styles.soldOut : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(variation)}
            >
              {label}
              {soldOut && <span className={styles.soldOutTag}> · esgotado</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default VariationSelector;
