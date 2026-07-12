import styles from "./styles.module.css";

// Seletor de enquadramento 3×3 (posições CSS por keyword). O ponto escolhido
// define qual região da imagem permanece visível quando o corte (cover) age.
const POSITIONS = [
  { value: "top left", label: "Topo à esquerda" },
  { value: "top", label: "Topo centralizado" },
  { value: "top right", label: "Topo à direita" },
  { value: "left", label: "Centro à esquerda" },
  { value: "center", label: "Centralizada" },
  { value: "right", label: "Centro à direita" },
  { value: "bottom left", label: "Base à esquerda" },
  { value: "bottom", label: "Base centralizada" },
  { value: "bottom right", label: "Base à direita" },
];

function PositionPicker({ value, onChange, disabled, idPrefix }) {
  return (
    <div className={styles.positionField}>
      <span className={styles.slotStatus}>Posição da imagem</span>

      <div className={styles.positionGrid} role="radiogroup" aria-label="Posição da imagem">
        {POSITIONS.map((position) => (
          <button
            key={position.value}
            id={`${idPrefix}-${position.value.replace(" ", "-")}`}
            type="button"
            role="radio"
            aria-checked={value === position.value}
            aria-label={position.label}
            title={position.label}
            disabled={disabled}
            className={
              value === position.value
                ? `${styles.positionDot} ${styles.positionDotActive}`
                : styles.positionDot
            }
            onClick={() => onChange(position.value)}
          />
        ))}
      </div>
    </div>
  );
}

export default PositionPicker;
