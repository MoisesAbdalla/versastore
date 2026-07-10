import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./styles.module.css";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import PinterestIcon from "@mui/icons-material/Pinterest";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Footer() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

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
            <li>Quem Somos</li>
            <li>Promoções</li>
            <li>Contato</li>
            <li>Política de Privacidade</li>
          </ul>
        </div>

        <div>
          <h4>Atendimento</h4>

          <ul>
            <li>Central de Ajuda</li>
            <li>Trocas e Devoluções</li>
            <li>Meus Pedidos</li>
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
                  <Link to="/privacy">Política de Privacidade</Link>.
                </span>
              </label>

              <button type="submit" disabled={!canSubmit}>
                Inscrever
              </button>
            </form>
          )}
        </div>
      </div>

      <div className={styles.copy}>
        © 2026 Versa Store - Todos os direitos reservados.
      </div>
    </footer>
  );
}

export default Footer;