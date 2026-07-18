import { describe, it, expect } from "vitest";

import { averageOf, roundHalf, starBreakdown, validateReview } from "../rating";
import { COMMENT_MAX } from "../../constants/review";

describe("averageOf", () => {
  it("vazio → 0", () => {
    expect(averageOf([])).toBe(0);
    expect(averageOf(undefined)).toBe(0);
  });

  it("média arredondada a 1 casa", () => {
    expect(averageOf([{ rating: 4 }, { rating: 5 }, { rating: 5 }])).toBe(4.7);
    expect(averageOf([{ rating: 5 }, { rating: 5 }])).toBe(5);
  });
});

describe("roundHalf", () => {
  it("arredonda para a meia mais próxima", () => {
    expect(roundHalf(4.3)).toBe(4.5);
    expect(roundHalf(4.1)).toBe(4);
    expect(roundHalf(4.75)).toBe(5);
  });
});

describe("starBreakdown", () => {
  it("4.5 → 4 cheias + 1 meia", () => {
    expect(starBreakdown(4.5)).toEqual(["full", "full", "full", "full", "half"]);
  });

  it("3 → 3 cheias + 2 vazias", () => {
    expect(starBreakdown(3)).toEqual(["full", "full", "full", "empty", "empty"]);
  });

  it("0 → 5 vazias", () => {
    expect(starBreakdown(0)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
  });
});

describe("validateReview", () => {
  it("recusa nota fora de 1–5 ou não inteira", () => {
    expect(validateReview({ rating: 0 }).errors.rating).toBeTruthy();
    expect(validateReview({ rating: 6 }).errors.rating).toBeTruthy();
    expect(validateReview({ rating: 3.5 }).errors.rating).toBeTruthy();
    expect(validateReview({ rating: null }).errors.rating).toBeTruthy();
  });

  it("recusa comentário acima do limite", () => {
    const long = "x".repeat(COMMENT_MAX + 1);
    expect(validateReview({ rating: 4, comment: long }).errors.comment).toBeTruthy();
  });

  it("aceita nota válida com comentário vazio ou dentro do limite", () => {
    expect(validateReview({ rating: 4, comment: "" }).ok).toBe(true);
    expect(validateReview({ rating: 5, comment: "Ótimo produto" }).ok).toBe(true);
  });
});
