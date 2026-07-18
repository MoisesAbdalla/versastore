import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";

import StarRating from "../StarRating";
import { useProductReviews } from "../../hooks/useProductReviews";
import { useAuth } from "../../contexts/AuthContext";
import { COMMENT_MAX } from "../../constants/review";
import { formatDate } from "../../utils/format";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

// Seletor de nota (1–5 estrelas clicáveis).
function StarInput({ value, onChange }) {
  return (
    <div className={styles.starInput} role="radiogroup" aria-label="Sua nota">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={styles.starBtn}
          aria-label={`${n} ${n > 1 ? "estrelas" : "estrela"}`}
          aria-pressed={value === n}
          onClick={() => onChange(n)}
        >
          {n <= value ? <StarIcon /> : <StarBorderIcon />}
        </button>
      ))}
    </div>
  );
}

// Seção "Avaliações" da página do produto (feature 015): resumo (média + contagem),
// formulário com gating (logado/comprou) e a lista de avaliações aprovadas.
function ProductReviews({ product }) {
  const { user } = useAuth();
  const r = useProductReviews(product.id);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [justSent, setJustSent] = useState(false);

  // Pré-preenche com a própria avaliação quando ela carrega.
  useEffect(() => {
    if (r.myReview) {
      setRating(r.myReview.rating);
      setComment(r.myReview.comment || "");
    }
  }, [r.myReview]);

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await r.submit({ rating, comment });
    if (ok) setJustSent(true);
  }

  const avg = product.ratingAvg ?? 0;
  const count = product.ratingCount ?? 0;
  const editingApproved = r.myReview?.status === "aprovada";

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Avaliações</h2>

      <div className={styles.summary}>
        <StarRating avg={avg} count={count} size="lg" />
        <span className={styles.summaryText}>
          {count > 0 ? `${avg} de 5 · ${count} ${count > 1 ? "avaliações" : "avaliação"}` : "Ainda sem avaliações"}
        </span>
      </div>

      {/* Formulário / gating */}
      {!user ? (
        <p className={styles.gate}>
          <Link to={ROUTES.LOGIN} className={styles.link}>
            Entre
          </Link>{" "}
          para avaliar este produto.
        </p>
      ) : r.eligibilityLoading ? (
        <p className={styles.muted}>Verificando se você pode avaliar…</p>
      ) : r.canReview ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <StarInput
            value={rating}
            onChange={(n) => {
              setRating(n);
              setJustSent(false);
            }}
          />
          <textarea
            className={styles.textarea}
            rows={3}
            maxLength={COMMENT_MAX}
            placeholder="Conte como foi sua experiência (opcional)"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setJustSent(false);
            }}
          />
          <div className={styles.formFoot}>
            <span className={styles.counter}>
              {comment.length}/{COMMENT_MAX}
            </span>
            <button type="submit" className={styles.submit} disabled={r.submitting || rating === 0}>
              {r.submitting ? "Enviando…" : r.myReview ? "Atualizar avaliação" : "Enviar avaliação"}
            </button>
          </div>
          {editingApproved && !justSent && (
            <p className={styles.hint}>Editar sua avaliação a enviará para nova análise.</p>
          )}
          {r.submitError && (
            <p className={styles.error} role="alert">
              {r.submitError}
            </p>
          )}
          {justSent && <p className={styles.sent}>Avaliação enviada! Ela aparecerá após a moderação.</p>}
          {!justSent && r.myReview?.status === "pendente" && (
            <p className={styles.muted}>Sua avaliação está em análise.</p>
          )}
        </form>
      ) : (
        <p className={styles.gate}>Só quem comprou este produto pode avaliá-lo.</p>
      )}

      {/* Lista de aprovadas */}
      <div className={styles.list}>
        {r.loading ? (
          <p className={styles.muted}>Carregando avaliações…</p>
        ) : r.reviews.length === 0 ? (
          <p className={styles.muted}>Ainda sem avaliações aprovadas.</p>
        ) : (
          r.reviews.map((rev) => (
            <div key={rev.id} className={styles.review}>
              <div className={styles.reviewHead}>
                <StarRating avg={rev.rating} count={0} size="sm" />
                <span className={styles.reviewName}>{rev.userName || "Cliente"}</span>
                <span className={styles.reviewDate}>{formatDate(rev.createdAt)}</span>
              </div>
              {rev.comment && <p className={styles.reviewText}>{rev.comment}</p>}
            </div>
          ))
        )}

        {r.hasMore && (
          <button type="button" className={styles.more} onClick={r.loadMore}>
            Ver mais
          </button>
        )}
      </div>
    </section>
  );
}

export default ProductReviews;
