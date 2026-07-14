import { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import styles from "./styles.module.css";

// Editor dos atributos do produto (feature 008): define nomes e a lista
// ORDENADA de valores permitidos por atributo. A ordem dos valores aqui é a
// ordem exibida no seletor da vitrine (FR-002a). Apresentacional — a lógica
// (conflito de fusão na remoção, bloqueio de valor em uso) fica no Form.
function AttributeEditor({
  attributes,
  onAddAttribute,
  onRenameAttribute,
  onRemoveAttribute,
  onAddValue,
  onMoveValue,
  onRemoveValue,
}) {
  const [drafts, setDrafts] = useState({}); // valor sendo digitado por atributo (índice → texto)

  function setDraft(index, value) {
    setDrafts((current) => ({ ...current, [index]: value }));
  }

  function submitValue(index) {
    const value = (drafts[index] || "").trim();

    if (value) {
      onAddValue(index, value);
      setDraft(index, "");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.hint}>
          Defina os atributos (ex.: Tamanho, Cor) e seus valores. A ordem dos valores é a que
          aparece na loja. As variações abaixo combinam um valor de cada atributo.
        </p>

        <Button size="small" startIcon={<AddIcon />} onClick={onAddAttribute}>
          Adicionar atributo
        </Button>
      </div>

      {attributes.map((attribute, index) => (
        <div key={index} className={styles.attribute}>
          <div className={styles.attrTop}>
            <TextField
              size="small"
              label="Nome do atributo"
              value={attribute.name}
              onChange={(e) => onRenameAttribute(index, e.target.value)}
              className={styles.attrName}
              placeholder="Tamanho"
            />

            <IconButton onClick={() => onRemoveAttribute(index)} aria-label="Remover atributo">
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </div>

          <ul className={styles.values}>
            {(attribute.values || []).map((value, valueIndex) => (
              <li key={value} className={styles.valueChip}>
                <span className={styles.valueText}>{value}</span>

                <IconButton
                  size="small"
                  disabled={valueIndex === 0}
                  onClick={() => onMoveValue(index, valueIndex, -1)}
                  aria-label={`Mover ${value} para cima`}
                >
                  <ArrowUpwardIcon fontSize="inherit" />
                </IconButton>

                <IconButton
                  size="small"
                  disabled={valueIndex === attribute.values.length - 1}
                  onClick={() => onMoveValue(index, valueIndex, 1)}
                  aria-label={`Mover ${value} para baixo`}
                >
                  <ArrowDownwardIcon fontSize="inherit" />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => onRemoveValue(index, value)}
                  aria-label={`Remover valor ${value}`}
                >
                  <DeleteOutlineOutlinedIcon fontSize="inherit" />
                </IconButton>
              </li>
            ))}
          </ul>

          <div className={styles.addValue}>
            <TextField
              size="small"
              label="Novo valor"
              value={drafts[index] || ""}
              onChange={(e) => setDraft(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitValue(index);
                }
              }}
              placeholder="P"
            />

            <Button size="small" onClick={() => submitValue(index)}>
              Adicionar valor
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AttributeEditor;
