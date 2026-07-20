import LegalDocument from "../LegalDocument";
import trocas from "../../../content/legal/trocas";

// Política de Trocas e Devoluções (feature 017 / M8) — inclui o direito de
// arrependimento de 7 dias (art. 49 CDC) em destaque obrigatório.
function Returns() {
  return (
    <LegalDocument
      doc={trocas}
      metaDescription="Política de trocas e devoluções da Versa Store: arrependimento em 7 dias (CDC), trocas por defeito e reembolsos."
    />
  );
}

export default Returns;
