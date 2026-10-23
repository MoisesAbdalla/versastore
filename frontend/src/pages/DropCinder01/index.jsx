import { useState } from "react";

import MainLayout from "../../layouts/MainLayout";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useCountdown } from "../../hooks/useCountdown";
import { useDropWaitlist } from "../../hooks/useDropWaitlist";
import CinderShoe from "./CinderShoe";
import styles from "./styles.module.css";

// Página de lançamento do tênis CINDER 01, marca KILN ATHLETIC (feature 019).
// Mundo escuro técnico, próprio da campanha — tokens escopados no styles.module.
// Contagem regressiva real + fila de espera com estoque limitado.
const DROP = {
  id: "cinder-01",
  brand: "KILN ATHLETIC",
  model: "CINDER 01",
  colorway: "Cinder / Bone / Ember",
  price: "R$ 899,00",
  totalStock: 300,
  dropAt: "2026-08-08T18:00:00-03:00",
  dropLabel: "08.08.26 · 18:00 BRT",
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function DropCinder01() {
  usePageMeta({
    title: "CINDER 01 — Drop KILN ATHLETIC",
    description:
      "Lançamento do tênis CINDER 01: 300 pares numerados, fila por sorteio e entrega técnica. Entre na lista antes do drop.",
  });

  const { days, hours, minutes, seconds, isLive } = useCountdown(DROP.dropAt);
  const { spotsLeft, totalStock, status, error, join } = useDropWaitlist({
    dropId: DROP.id,
    totalStock: DROP.totalStock,
  });

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const joined = status === "success";
  const submitting = status === "submitting";
  const invalid = touched && !EMAIL_RE.test(email.trim());

  const pad = (n) => String(n).padStart(2, "0");

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);

    if (!EMAIL_RE.test(email.trim())) return;

    await join(email);
  }

  return (
    <MainLayout>
      <div className={styles.wrap}>
        <div className={styles.inner}>
          {/* HERO */}
          <div className={styles.eyebrow}>
            <span className={`${styles.tag} ${styles.tagEmber} ${styles.lbl}`}>■ Drop limitado</span>
            <span className={`${styles.tag} ${styles.lbl}`}>Lançamento SS26</span>
            <span className={`${styles.tag} ${styles.lbl} ${styles.num}`}>300 pares · numerados</span>
          </div>

          <h1 className={styles.display}>
            Cinder <span className={styles.em}>01</span>
          </h1>

          <p className={styles.sub}>
            A primeira silhueta da <b>{DROP.brand}</b>. Cabedal em neoprene e ripstop sobre entressola
            vulcanizada creme — <b>colorway {DROP.colorway}</b>. Feita pra durar mais que o hype.
          </p>

          {/* STAGE: tênis + painel de compra */}
          <div className={styles.stage}>
            <div className={styles.stageGrid} />
            <div className={styles.stageInner}>
              <div className={styles.shoeCell}>
                <CinderShoe />
                <div className={styles.shoeCap}>
                  <span className={styles.lbl}>Fig. 01 — perfil lateral</span>
                  <span className={`${styles.lbl} ${styles.num}`}>CA-01 / BONE / EMBER</span>
                </div>
              </div>

              {/* PAINEL DE COMPRA */}
              <div className={styles.buyCell}>
                <div>
                  <div className={styles.cdLabel}>
                    <span className={styles.lbl}>{isLive ? "Drop ao vivo" : "Abre em"}</span>
                    <span className={`${styles.lbl} ${styles.num}`}>{DROP.dropLabel}</span>
                  </div>
                  <div className={`${styles.cd} ${isLive ? styles.cdLive : ""}`}>
                    <div className={styles.unit}>
                      <div className={`${styles.unitV} ${styles.num}`}>{pad(days)}</div>
                      <div className={styles.unitU}>dias</div>
                    </div>
                    <div className={styles.unit}>
                      <div className={`${styles.unitV} ${styles.num}`}>{pad(hours)}</div>
                      <div className={styles.unitU}>hrs</div>
                    </div>
                    <div className={styles.unit}>
                      <div className={`${styles.unitV} ${styles.num}`}>{pad(minutes)}</div>
                      <div className={styles.unitU}>min</div>
                    </div>
                    <div className={styles.unit}>
                      <div className={`${styles.unitV} ${styles.num}`}>{pad(seconds)}</div>
                      <div className={styles.unitU}>seg</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className={styles.stockRow}>
                    <span className={styles.lbl}>Estoque</span>
                    <span className={`${styles.stockBig} ${styles.num}`}>
                      {spotsLeft} / {totalStock}
                    </span>
                  </div>
                  <div className={styles.meter}>
                    <span
                      className={styles.meterFill}
                      style={{ width: `${(spotsLeft / totalStock) * 100}%` }}
                    />
                  </div>
                  <div className={`${styles.lbl} ${styles.num} ${styles.price}`}>
                    {DROP.price} · par numerado
                  </div>
                </div>

                {joined ? (
                  <div className={styles.ok}>
                    ✓ Você está na fila. Confirmação enviada — chega às 18:00.
                  </div>
                ) : (
                  <form className={styles.form} onSubmit={handleSubmit} noValidate>
                    <div className={styles.field}>
                      <input
                        type="email"
                        className={`${styles.input} ${invalid ? styles.inputError : ""}`}
                        placeholder="voce@email.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-label="Seu e-mail"
                        aria-invalid={invalid}
                        required
                      />
                      <button className={styles.cta} type="submit" disabled={submitting}>
                        {submitting ? "Enviando…" : "Entrar na lista"}
                      </button>
                    </div>
                    {invalid && <span className={styles.errorMsg}>Informe um e-mail válido.</span>}
                    {status === "error" && error && (
                      <span className={styles.errorMsg}>{error}</span>
                    )}
                    <span className={styles.fineprint}>
                      Reserva na fila do drop. Sorteio entre inscritos · 1 par por CPF.
                    </span>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* FICHA TÉCNICA */}
          <section className={styles.section}>
            <div className={styles.kicker}>
              <span className={styles.kickerN}>/ 01</span>
              <h2 className={styles.kickerH}>Ficha técnica</h2>
              <span className={styles.rule} />
            </div>
            <div className={styles.specs}>
              {[
                { k: "Modelo", v: "Cinder 01", em: true },
                { k: "Colorway", v: "Cinder / Bone / Ember" },
                { k: "Cabedal", v: "Neoprene · ripstop · couro" },
                { k: "Entressola", v: "Vulcanizada creme" },
                { k: "Drop", v: "08.08.26 — 18h" },
                { k: "Tiragem", v: "300 pares" },
                { k: "Numeração", v: "35 — 44 BR" },
                { k: "Preço", v: "R$ 899,00" },
              ].map((spec) => (
                <div className={styles.specCell} key={spec.k}>
                  <div className={`${styles.specK} ${styles.lbl}`}>{spec.k}</div>
                  <div className={`${styles.specVal} ${spec.em ? styles.specValEm : ""} ${styles.num}`}>
                    {spec.v}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* MECÂNICA DO DROP */}
          <section className={styles.section}>
            <div className={styles.kicker}>
              <span className={styles.kickerN}>/ 02</span>
              <h2 className={styles.kickerH}>Como funciona o drop</h2>
              <span className={styles.rule} />
            </div>
            <div className={styles.cards}>
              {[
                {
                  n: "01",
                  idx: "FILA",
                  h: "Entra na lista",
                  p: "Cadastre o e-mail acima até 08.08 — 17:59. Só quem está na fila recebe o link de compra.",
                },
                {
                  n: "02",
                  idx: "SORTEIO",
                  h: "Acesso por sorteio",
                  p: "Às 18:00 sorteamos a ordem de entrada. Estoque real de 300 pares — sem reinício de contador, sem teatro.",
                },
                {
                  n: "03",
                  idx: "CHECKOUT",
                  h: "10 min pra fechar",
                  p: "Selecionado, você tem 10 minutos pra concluir. Não fechou, o par volta pra fila.",
                },
              ].map((card) => (
                <div className={styles.card} key={card.n}>
                  <span className={styles.cardGlyph}>{card.n}</span>
                  <div className={styles.cardIdx}>{card.idx}</div>
                  <h3 className={styles.cardH}>{card.h}</h3>
                  <p className={styles.cardP}>{card.p}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ÂNCORA DECLARADA */}
          <section className={styles.section}>
            <div className={styles.anchor}>
              <div className={styles.badge}>
                ÂNCORA
                <br />
                DECLARADA
              </div>
              <p className={styles.anchorP}>
                <b>Referência de linguagem: Nike SNKRS / ISPA.</b> Estética técnica, tipografia
                monoespaçada, mecânica de drop com fila e sorteio, e um vocabulário de engenharia
                sobre um produto minimalista. Nenhum ativo, logo ou copy da marca-âncora foi
                reproduzido — só a gramática visual do formato drop.
              </p>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

export default DropCinder01;
