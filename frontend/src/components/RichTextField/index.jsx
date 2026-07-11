import { useEffect, useRef } from "react";
import IconButton from "@mui/material/IconButton";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";

import { sanitizeHtml } from "./sanitize";
import styles from "./styles.module.css";

// Editor leve de formatação básica (negrito/itálico/listas) sem dependência
// nova (research R-11). execCommand é deprecated mas estável para estes 4
// comandos; encapsulado aqui para troca futura. O HTML só sai sanitizado.
function RichTextField({ label, value, onChange, placeholder }) {
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;

    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = sanitizeHtml(value || "");
    }
    // Sincroniza apenas na montagem/troca de produto — durante a digitação o
    // DOM do contentEditable é a fonte de verdade (evita pular o cursor).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitChange() {
    onChange(sanitizeHtml(editorRef.current.innerHTML));
  }

  function exec(command) {
    editorRef.current.focus();
    document.execCommand(command);
    emitChange();
  }

  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}

      <div className={styles.toolbar} role="toolbar" aria-label="Formatação">
        <IconButton size="small" onClick={() => exec("bold")} aria-label="Negrito">
          <FormatBoldIcon fontSize="small" />
        </IconButton>

        <IconButton size="small" onClick={() => exec("italic")} aria-label="Itálico">
          <FormatItalicIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => exec("insertUnorderedList")}
          aria-label="Lista com marcadores"
        >
          <FormatListBulletedIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => exec("insertOrderedList")}
          aria-label="Lista numerada"
        >
          <FormatListNumberedIcon fontSize="small" />
        </IconButton>
      </div>

      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={label || "Descrição"}
        data-placeholder={placeholder || ""}
        onInput={emitChange}
        onBlur={emitChange}
      />
    </div>
  );
}

export default RichTextField;
