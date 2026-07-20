import LegalDocument from "../LegalDocument";
import privacidade from "../../../content/legal/privacidade";

// Política de Privacidade real (LGPD, feature 017 / M8) — substitui o provisório.
function Privacy() {
  return (
    <LegalDocument
      doc={privacidade}
      metaDescription="Política de privacidade da Versa Store: quais dados coletamos, como usamos e seus direitos pela LGPD."
    />
  );
}

export default Privacy;
