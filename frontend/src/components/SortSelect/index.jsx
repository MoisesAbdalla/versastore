import styles from "./styles.module.css";

const OPTIONS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "preco-asc", label: "Menor preço" },
  { value: "preco-desc", label: "Maior preço" },
  { value: "nome-asc", label: "Nome (A–Z)" },
  { value: "nome-desc", label: "Nome (Z–A)" },
];

// Ordenação do catálogo (estado na URL). Desabilitada durante busca ativa —
// os resultados de busca vêm por relevância/recência (FR-013/R-9).
function SortSelect({ value, onChange, disabled = false }) {
  return (
    <label className={styles.wrapper}>
      <span className={styles.label}>Ordenar por</span>

      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Ordenar produtos"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default SortSelect;
