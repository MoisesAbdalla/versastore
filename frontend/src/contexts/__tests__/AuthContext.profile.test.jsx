import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let authStateCallback = null;

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth, cb) => {
    authStateCallback = cb;
    return () => {};
  },
}));

vi.mock("../../firebase/auth", () => ({ default: { currentUser: null } }));

const ensureUserProfileMock = vi.fn();
const getFullProfileMock = vi.fn();

vi.mock("../../services/userService", () => ({
  ensureUserProfile: (...a) => ensureUserProfileMock(...a),
  getFullProfile: (...a) => getFullProfileMock(...a),
  isProfileComplete: (p) => Boolean(p?.phone) && p?.termsAcceptedAt != null,
}));

import { AuthProvider, useAuth } from "../AuthContext";

function Probe() {
  const { user, profileIncomplete, loading } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.uid : "none"}</span>
      <span data-testid="incomplete">{String(profileIncomplete)}</span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authStateCallback = null;
});

describe("AuthContext — perfil e cadastro incompleto (feature 007)", () => {
  it("profileIncomplete true quando falta telefone/aceite (Google recém-entrado)", async () => {
    ensureUserProfileMock.mockResolvedValue({});
    getFullProfileMock.mockResolvedValue({
      role: "customer",
      name: "Ana",
      phone: "",
      termsAcceptedAt: null,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(authStateCallback).toBeTypeOf("function"));
    await authStateCallback({ uid: "g1" });

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("g1");
    expect(screen.getByTestId("incomplete").textContent).toBe("true");
  });

  it("profileIncomplete false quando o perfil está completo", async () => {
    ensureUserProfileMock.mockResolvedValue({});
    getFullProfileMock.mockResolvedValue({
      role: "customer",
      name: "Maria",
      phone: "11912345678",
      termsAcceptedAt: "ts",
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(authStateCallback).toBeTypeOf("function"));
    await authStateCallback({ uid: "u1" });

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("incomplete").textContent).toBe("false");
  });
});
