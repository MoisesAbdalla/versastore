import { describe, it, expect, vi, beforeEach } from "vitest";

const createUserMock = vi.fn();
const signInMock = vi.fn();
const signInPopupMock = vi.fn();
const sendResetMock = vi.fn();
const updateProfileMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...a) => createUserMock(...a),
  signInWithEmailAndPassword: (...a) => signInMock(...a),
  signInWithPopup: (...a) => signInPopupMock(...a),
  GoogleAuthProvider: class {},
  sendPasswordResetEmail: (...a) => sendResetMock(...a),
  updateProfile: (...a) => updateProfileMock(...a),
  signOut: (...a) => signOutMock(...a),
}));

vi.mock("../../firebase/auth", () => ({ default: {} }));

const createCustomerProfileMock = vi.fn();
const ensureUserProfileMock = vi.fn();

vi.mock("../userService", () => ({
  createCustomerProfile: (...a) => createCustomerProfileMock(...a),
  ensureUserProfile: (...a) => ensureUserProfileMock(...a),
}));

import { register, loginWithGoogle, resetPassword } from "../authService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("register (feature 007)", () => {
  it("define displayName e grava o perfil autoritativo com o nome", async () => {
    createUserMock.mockResolvedValueOnce({ user: { uid: "u1", email: "a@b.com" } });

    await register({
      name: "Maria Silva",
      email: "a@b.com",
      password: "senha1234",
      phone: "11912345678",
      termsAccepted: true,
    });

    expect(updateProfileMock).toHaveBeenCalledWith(
      { uid: "u1", email: "a@b.com" },
      { displayName: "Maria Silva" }
    );

    const [uid, data] = createCustomerProfileMock.mock.calls[0];

    expect(uid).toBe("u1");
    expect(data.name).toBe("Maria Silva");
    expect(data.phone).toBe("11912345678");
    expect(data.termsVersion).toBe("2026-07-13");
  });

  it("traduz e-mail já em uso para o código de domínio", async () => {
    createUserMock.mockRejectedValueOnce({ code: "auth/email-already-in-use" });

    await expect(
      register({ name: "X", email: "a@b.com", password: "senha1234", phone: "1", termsAccepted: true })
    ).rejects.toMatchObject({ code: "email-em-uso" });
  });
});

describe("loginWithGoogle", () => {
  it("garante o doc do cliente com authProvider google", async () => {
    signInPopupMock.mockResolvedValueOnce({ user: { uid: "g1", displayName: "Ana", email: "ana@x.com" } });

    await loginWithGoogle();

    expect(ensureUserProfileMock).toHaveBeenCalledWith(
      { uid: "g1", displayName: "Ana", email: "ana@x.com" },
      { authProvider: "google" }
    );
  });
});

describe("resetPassword (resposta neutra, SC-005)", () => {
  it("não lança para e-mail inexistente", async () => {
    sendResetMock.mockRejectedValueOnce({ code: "auth/user-not-found" });

    await expect(resetPassword("naoexiste@x.com")).resolves.toBeUndefined();
  });

  it("não lança para e-mail inválido (mesma resposta neutra)", async () => {
    sendResetMock.mockRejectedValueOnce({ code: "auth/invalid-email" });

    await expect(resetPassword("invalido")).resolves.toBeUndefined();
  });

  it("propaga erro real (rede) para 'tentar novamente'", async () => {
    sendResetMock.mockRejectedValueOnce({ code: "auth/network-request-failed" });

    await expect(resetPassword("a@b.com")).rejects.toMatchObject({
      code: "auth/network-request-failed",
    });
  });

  it("resolve normalmente quando o envio funciona", async () => {
    sendResetMock.mockResolvedValueOnce(undefined);

    await expect(resetPassword("a@b.com")).resolves.toBeUndefined();
  });
});
