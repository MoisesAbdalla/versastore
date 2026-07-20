import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./styles.module.css";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import PinterestIcon from "@mui/icons-material/Pinterest";
import { useStoreSettings } from "../../hooks/useStoreSettings";
import ROUTES from "../../constants/routes";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Footer() {
  const store = useStoreSettings();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Identificação do fornecedor (feature 017 / Decreto 7.962/2013): exibida
  // quando configurada em Admin → Dados da loja; campos vazios são omitidos.
  const identification = [
    [store.razaoSocial, store.cnpj && `CNPJ ${store.cnpj}`].filter(Boolean).join(" · "),
    store.endereco,
    [store.email, store.telefone].filter(Boolean).join(" · "),
  ].filter(Boolean);

  const canSubmit = consent && EMAIL_PATTERN.test(email);

  function handleSubscribe(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubscribed(true);
  }

  return (
    <footer id="rodape" className={styles.footer}>
      <div className={styles.container}>
        <div>
          <h3>Versa Store</h3>
          <p>
            Sua loja online com qualidade, tecnologia e confiança.
          </p>

          <div className={styles.social}>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noreferrer" aria-label="Pinterest">
              <PinterestIcon />
            </a>
          </div>
        </div>

        <div>
          <h4>Institucional</h4>

          <ul>
            <li>
              <Link to={ROUTES.SOBRE}>Quem somos</Link>
            </li>
            <li>
              <Link to={ROUTES.CONTATO}>Contato</Link>
            </li>
            <li>
              <Link to={ROUTES.TERMOS}>Termos de uso</Link>
            </li>
            <li>
              <Link to={ROUTES.PRIVACIDADE}>Política de privacidade</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>Atendimento</h4>

          <ul>
            <li>
              <Link to={ROUTES.TROCAS}>Trocas e devoluções</Link>
            </li>
            <li>
              <Link to={ROUTES.CONTA_PEDIDOS}>Meus pedidos</Link>
            </li>
            <li>
              <Link to={ROUTES.CONTA}>Minha conta</Link>
            </li>
          </ul>
        </div>

        <div className={styles.newsletter}>
          <h4>Newsletter</h4>

          <p>Receba novidades e lançamentos em primeira mão.</p>

          {subscribed ? (
            <p className={styles.subscribed}>Inscrição confirmada.</p>
          ) : (
            <form onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  Aceito receber e-mails da Versa Store e li a{" "}
                  <Link to={ROUTES.PRIVACIDADE}>Política de Privacidade</Link>.
                </span>
              </label>

              <button type="submit" disabled={!canSubmit}>
                Inscrever
              </button>
            </form>
          )}
        </div>
      </div>

      {identification.length > 0 && (
        <div className={styles.identification}>
          {identification.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}

      <div className={styles.copy}>
        © 2026 Versa Store - Todos os direitos reservados.
      </div>
    </footer>
  );
}

export default Footer;