// Cálculo e exibição de avaliações (feature 015) — funções puras, reutilizadas
// pelo serviço (média), pelo componente de estrelas e pela validação do form.
import { COMMENT_MAX } from "../constants/review";

// Média das notas (0 se vazio), arredondada a 1 casa decimal.
export function averageOf(reviews) {
  if (!reviews || reviews.length === 0) {
    return 0;
  }

  const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

// Arredonda para a meia-estrela mais próxima (exibição).
export function roundHalf(value) {
  return Math.round((value || 0) * 2) / 2;
}

// Quebra a média em 5 estrelas: "full" | "half" | "empty".
export function starBreakdown(avg) {
  const rounded = roundHalf(avg);
  const out = [];

  for (let i = 1; i <= 5; i += 1) {
    if (rounded >= i) {
      out.push("full");
    } else if (rounded >= i - 0.5) {
      out.push("half");
    } else {
      out.push("empty");
    }
  }

  return out;
}

// Validação do formulário: nota inteira 1–5 (obrigatória), comentário no limite.
export function validateReview({ rating, comment }) {
  const errors = {};

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "Dê uma nota de 1 a 5 estrelas.";
  }

  if ((comment || "").trim().length > COMMENT_MAX) {
    errors.comment = `O comentário deve ter no máximo ${COMMENT_MAX} caracteres.`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
