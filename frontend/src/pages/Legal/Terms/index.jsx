import LegalDocument from "../LegalDocument";
import termos from "../../../content/legal/termos";

// Termos de Uso reais (feature 017 / M8) — substitui o provisório do M3.
function Terms() {
  return (
    <LegalDocument
      doc={termos}
      metaDescription="Termos de uso da Versa Store: cadastro, compras, pagamentos, entrega, trocas e responsabilidades."
    />
  );
}

export default Terms;
