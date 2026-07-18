import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../contexts/AuthContext";
import {
  getApprovedReviews,
  getMyReview,
  hasPurchased,
  submitReview,
} from "../services/reviewService";
import { validateReview } from "../utils/rating";

// Estado das avaliações na página do produto (feature 015): lista de aprovadas
// (paginada), a própria avaliação, a elegibilidade ("comprou") e o envio.
export function useProductReviews(productId) {
  const { user, profile } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const [myReview, setMyReview] = useState(null);
  const [purchased, setPurchased] = useState(false);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Lista de aprovadas (1ª página).
  useEffect(() => {
    let active = true;
    setLoading(true);

    getApprovedReviews(productId, {})
      .then((res) => {
        if (!active) return;
        setReviews(res.items);
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      })
      .catch(() => {
        if (active) {
          setReviews([]);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  // Minha avaliação + elegibilidade (comprou).
  useEffect(() => {
    let active = true;

    if (!user) {
      setMyReview(null);
      setPurchased(false);
      setEligibilityLoading(false);
      return undefined;
    }

    setEligibilityLoading(true);

    Promise.all([getMyReview(productId, user.uid), hasPurchased(user.uid, productId)])
      .then(([mine, bought]) => {
        if (!active) return;
        setMyReview(mine);
        setPurchased(bought);
      })
      .catch(() => {
        if (active) {
          setMyReview(null);
          setPurchased(false);
        }
      })
      .finally(() => {
        if (active) setEligibilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, user]);

  const canReview = Boolean(user) && purchased;

  const loadMore = useCallback(async () => {
    if (!cursor) return;

    const res = await getApprovedReviews(productId, { cursor });
    setReviews((prev) => [...prev, ...res.items]);
    setCursor(res.nextCursor);
    setHasMore(res.hasMore);
  }, [productId, cursor]);

  const submit = useCallback(
    async ({ rating, comment }) => {
      setSubmitError(null);

      const check = validateReview({ rating, comment });
      if (!check.ok) {
        setSubmitError(check.errors.rating || check.errors.comment);
        return false;
      }

      if (!user) {
        return false;
      }

      setSubmitting(true);

      try {
        const userName = (profile?.name || "").trim().split(" ")[0] || "Cliente";
        await submitReview({ productId, uid: user.uid, userName, rating, comment });
        setMyReview(await getMyReview(productId, user.uid));
        return true;
      } catch {
        setSubmitError("Não foi possível enviar sua avaliação. Tente novamente.");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [productId, user, profile]
  );

  return {
    reviews,
    hasMore,
    loadMore,
    loading,
    myReview,
    canReview,
    purchased,
    eligibilityLoading,
    submit,
    submitting,
    submitError,
  };
}
