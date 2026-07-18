import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const auth = { user: { uid: "u1" }, profile: { name: "Ana Souza" } };
const getApprovedMock = vi.fn();
const getMyMock = vi.fn();
const hasPurchasedMock = vi.fn();
const submitMock = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../services/reviewService", () => ({
  getApprovedReviews: (...a) => getApprovedMock(...a),
  getMyReview: (...a) => getMyMock(...a),
  hasPurchased: (...a) => hasPurchasedMock(...a),
  submitReview: (...a) => submitMock(...a),
}));

import { useProductReviews } from "../useProductReviews";

beforeEach(() => {
  auth.user = { uid: "u1" };
  auth.profile = { name: "Ana Souza" };
  getApprovedMock.mockReset().mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
  getMyMock.mockReset().mockResolvedValue(null);
  hasPurchasedMock.mockReset().mockResolvedValue(true);
  submitMock.mockReset().mockResolvedValue(undefined);
});

describe("useProductReviews", () => {
  it("canReview true quando logado e comprou", async () => {
    const { result } = renderHook(() => useProductReviews("p1"));
    await waitFor(() => expect(result.current.eligibilityLoading).toBe(false));
    expect(result.current.canReview).toBe(true);
  });

  it("canReview false quando não comprou", async () => {
    hasPurchasedMock.mockResolvedValue(false);
    const { result } = renderHook(() => useProductReviews("p1"));
    await waitFor(() => expect(result.current.eligibilityLoading).toBe(false));
    expect(result.current.canReview).toBe(false);
  });

  it("canReview false quando deslogado", async () => {
    auth.user = null;
    const { result } = renderHook(() => useProductReviews("p1"));
    await waitFor(() => expect(result.current.eligibilityLoading).toBe(false));
    expect(result.current.canReview).toBe(false);
  });

  it("submit válido chama submitReview (com primeiro nome) e revalida a própria", async () => {
    getMyMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "p1_u1", rating: 4, status: "pendente" });
    const { result } = renderHook(() => useProductReviews("p1"));
    await waitFor(() => expect(result.current.eligibilityLoading).toBe(false));

    let ok;
    await act(async () => {
      ok = await result.current.submit({ rating: 4, comment: "bom" });
    });

    expect(ok).toBe(true);
    expect(submitMock).toHaveBeenCalledWith({ productId: "p1", uid: "u1", userName: "Ana", rating: 4, comment: "bom" });
    expect(result.current.myReview).toMatchObject({ status: "pendente", rating: 4 });
  });

  it("submit com nota inválida não chama o service e seta erro", async () => {
    const { result } = renderHook(() => useProductReviews("p1"));
    await waitFor(() => expect(result.current.eligibilityLoading).toBe(false));

    let ok;
    await act(async () => {
      ok = await result.current.submit({ rating: 0, comment: "" });
    });

    expect(ok).toBe(false);
    expect(submitMock).not.toHaveBeenCalled();
    expect(result.current.submitError).toBeTruthy();
  });
});
