import styles from "./styles.module.css";

// Seletor de variação POR ATRIBUTO (feature 008, US2): uma linha de opções por
// atributo (ex.: Tamanho em cima, Cor embaixo), TODAS visíveis desde o início.
// Valores sem combinação disponível ficam desabilitados/riscados conforme a
// seleção; ordem de escolha livre. Apresentacional — a disponibilidade vem do
// hook useVariationSelection. Suporta 1, 2 ou 3+ atributos.
function VariationSelector({ optionsByAttribute, selected, onSelect }) {
  return (
    <div className={styles.selector}>
      {optionsByAttribute.map(({ name, options }) => (
        <div key={name} className={styles.attribute}>
          <span className={styles.label}>{name}</span>

          <div className={styles.options}>
            {options.map(({ value, available }) => {
              const isSelected = selected[name] === value;

              return (
                <button
                  key={value}
                  type="button"
                  disabled={!available && !isSelected}
                  aria-pressed={isSelected}
                  className={[
                    styles.option,
                    isSelected ? styles.selected : "",
                    !available ? styles.unavailable : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onSelect(name, value)}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default VariationSelector;
