import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const auth = { user: { uid: "u1" }, profile: { wishlist: ["a"] } };
const addMock = vi.fn().mockResolvedValue(undefined);
const removeMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../services/userService", () => ({
  addToWishlist: (...a) => addMock(...a),
  removeFromWishlist: (...a) => removeMock(...a),
}));

import { WishlistProvider, useWishlist } from "../WishlistContext";

const wrapper = ({ children }) => <WishlistProvider>{children}</WishlistProvider>;

beforeEach(() => {
  auth.user = { uid: "u1" };
  auth.profile = { wishlist: ["a"] };
  addMock.mockClear().mockResolvedValue(undefined);
  removeMock.mockClear().mockResolvedValue(undefined);
});

describe("WishlistContext", () => {
  it("semeia a lista a partir do perfil", async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    await waitFor(() => expect(result.current.ids).toEqual(["a"]));
    expect(result.current.count).toBe(1);
    expect(result.current.isFavorite("a")).toBe(true);
    expect(result.current.isFavorite("z")).toBe(false);
  });

  it("toggle adiciona (otimista) e persiste", async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual(["a"]));

    await act(async () => {
      await result.current.toggle("b");
    });

    expect(result.current.isFavorite("b")).toBe(true);
    expect(result.current.count).toBe(2);
    expect(addMock).toHaveBeenCalledWith("u1", "b");
  });

  it("toggle remove um já favoritado", async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual(["a"]));

    await act(async () => {
      await result.current.toggle("a");
    });

    expect(result.current.isFavorite("a")).toBe(false);
    expect(removeMock).toHaveBeenCalledWith("u1", "a");
  });

  it("sem usuário logado, toggle é no-op (não persiste)", async () => {
    auth.user = null;
    auth.profile = null;
    const { result } = renderHook(() => useWishlist(), { wrapper });

    await act(async () => {
      await result.current.toggle("b");
    });

    expect(result.current.isFavorite("b")).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("reverte o otimismo se a persistência falhar", async () => {
    addMock.mockRejectedValueOnce(new Error("rede"));
    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual(["a"]));

    await act(async () => {
      await result.current.toggle("b");
    });

    expect(result.current.isFavorite("b")).toBe(false); // revertido
  });
});
