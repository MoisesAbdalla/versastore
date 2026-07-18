import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";

import StarRating from "../../../components/StarRating";
import {
  listReviews,
  approveReview,
  hideReview,
  deleteReview,
} from "../../../services/reviewService";
import { REVIEW_STATUS, REVIEW_STATUS_LABELS } from "../../../constants/review";
import { useFeedback } from "../../../contexts/FeedbackContext";
import { formatDate } from "../../../utils/format";
import ROUTES from "../../../constants/routes";
import styles from "./styles.module.css";

const FILTERS = [REVIEW_STATUS.PENDENTE, REVIEW_STATUS.APROVADA, REVIEW_STATUS.OCULTA];

function ReviewsPage() {
  const { toastSuccess, toastError } = useFeedback();
  const [status, setStatus] = useState(REVIEW_STATUS.PENDENTE);
  const [items, setItems] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [acting, setActing] = useState(false);

  const reload = useCallback(async () => {
    const [list, pend] = await Promise.all([
      listReviews({ status }),
      listReviews({ status: REVIEW_STATUS.PENDENTE }),
    ]);
    setItems(list);
    setPendingCount(pend.length);
  }, [status]);

  useEffect(() => {
    setItems(null);
    reload().catch(() => toastError("Não foi possível carregar as avaliações."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function run(action, successMsg, review) {
    setActing(true);
    try {
      await action(review.id);
      await reload();
      toastSuccess(successMsg);
    } catch {
      toastError("Não foi possível concluir a ação.");
    } finally {
      setActing(false);
    }
  }

  function handleDelete(review) {
    if (!window.confirm("Remover esta avaliação?")) return;
    run(deleteReview, "Avaliação removida.", review);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Avaliações {pendingCount > 0 && <span className={styles.badge}>{pendingCount} pendente(s)</span>}
        </h1>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={s === status ? `${styles.filter} ${styles.filterActive}` : styles.filter}
            onClick={() => setStatus(s)}
          >
            {REVIEW_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {items === null ? (
        <p className={styles.muted}>Carregando…</p>
      ) : items.length === 0 ? (
        <p className={styles.muted}>Nenhuma avaliação {REVIEW_STATUS_LABELS[status].toLowerCase()}.</p>
      ) : (
        <div className={styles.list}>
          {items.map((review) => (
            <div key={review.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowTop}>
                  <StarRating avg={review.rating} count={0} size="sm" />
                  <span className={styles.author}>{review.userName || "Cliente"}</span>
                  <span className={styles.date}>{formatDate(review.createdAt)}</span>
                  <Link className={styles.product} to={`${ROUTES.PRODUCT}/${review.productId}`}>
                    ver produto
                  </Link>
                </div>
                {review.comment && <p className={styles.comment}>{review.comment}</p>}
              </div>

              <div className={styles.actions}>
                {review.status !== REVIEW_STATUS.APROVADA && (
                  <Button size="small" variant="contained" disabled={acting} onClick={() => run(approveReview, "Avaliação aprovada.", review)}>
                    Aprovar
                  </Button>
                )}
                {review.status !== REVIEW_STATUS.OCULTA && (
                  <Button size="small" disabled={acting} onClick={() => run(hideReview, "Avaliação ocultada.", review)}>
                    Ocultar
                  </Button>
                )}
                <Button size="small" color="error" disabled={acting} onClick={() => handleDelete(review)}>
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
