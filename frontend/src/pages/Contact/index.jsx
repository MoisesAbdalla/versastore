import MainLayout from "../../layouts/MainLayout";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";

import { useStoreSettings } from "../../hooks/useStoreSettings";
import { usePageMeta } from "../../hooks/usePageMeta";
import styles from "./styles.module.css";

// Página de Contato (feature 017 / M8): canais diretos configurados em
// Admin → Dados da loja — sem formulário/backend (mailto, wa.me, tel).
function Contact() {
  const store = useStoreSettings();

  usePageMeta({
    title: "Contato",
    description: "Fale com a Versa Store: e-mail, WhatsApp e telefone para dúvidas, pedidos e trocas.",
  });

  const hasChannels = store.email || store.whatsapp || store.telefone || store.endereco;

  return (
    <MainLayout>
      <div className={styles.page}>
        <h1 className={styles.title}>Contato</h1>

        <p className={styles.paragraph}>
          Dúvidas sobre um pedido, trocas (inclusive o arrependimento de 7 dias) ou qualquer outro
          assunto? Fale com a gente pelos canais abaixo — tenha o número do pedido em mãos para
          agilizar o atendimento.
        </p>

        {store.loading ? (
          <p className={styles.muted}>Carregando…</p>
        ) : !hasChannels ? (
          <p className={styles.muted}>Nossos canais de contato serão publicados em breve.</p>
        ) : (
          <ul className={styles.channels}>
            {store.email && (
              <li>
                <EmailOutlinedIcon />
                <a href={`mailto:${store.email}`}>{store.email}</a>
              </li>
            )}
            {store.whatsapp && (
              <li>
                <WhatsAppIcon />
                <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </li>
            )}
            {store.telefone && (
              <li>
                <PhoneOutlinedIcon />
                <a href={`tel:${store.telefone.replace(/\D/g, "")}`}>{store.telefone}</a>
              </li>
            )}
            {store.endereco && (
              <li>
                <PlaceOutlinedIcon />
                <span>{store.endereco}</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </MainLayout>
  );
}

export default Contact;
