import MainLayout from "../../layouts/MainLayout";
import { TERMS_VERSION } from "../../constants/terms";
import { usePageMeta } from "../../hooks/usePageMeta";
import styles from "./styles.module.css";

// Renderizador comum dos documentos legais (feature 017 / M8): título, versão
// vigente, bloco de destaque opcional (ex.: arrependimento de 7 dias) e seções.
// O conteúdo vem de src/content/legal/* (minutas para revisão do lojista).
function LegalDocument({ doc, metaDescription }) {
  usePageMeta({ title: doc.title, description: metaDescription });

  return (
    <MainLayout>
      <div className={styles.page}>
        <h1 className={styles.title}>{doc.title}</h1>
        <p className={styles.version}>Versão {TERMS_VERSION}</p>

        {doc.highlight && (
          <div className={styles.highlight} role="note">
            <p className={styles.highlightTitle}>{doc.highlight.title}</p>
            {doc.highlight.paragraphs.map((text, i) => (
              <p key={i} className={styles.paragraph}>
                {text}
              </p>
            ))}
          </div>
        )}

        {doc.sections.map((section, i) => (
          <section key={i}>
            {section.heading && <h2 className={styles.sectionHeading}>{section.heading}</h2>}
            {section.paragraphs.map((text, j) => (
              <p key={j} className={styles.paragraph}>
                {text}
              </p>
            ))}
          </section>
        ))}

        <p className={styles.draftNote}>
          Documento modelo elaborado para a Versa Store — revise com seu responsável jurídico antes
          do lançamento. Este texto não constitui aconselhamento jurídico.
        </p>
      </div>
    </MainLayout>
  );
}

export default LegalDocument;
