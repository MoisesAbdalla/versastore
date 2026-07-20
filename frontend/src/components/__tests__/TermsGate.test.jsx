import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { TERMS_VERSION } from "../../constants/terms";

const auth = { user: { uid: "u1" }, profile: null, reloadProfile: vi.fn() };
const acceptMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../services/userService", () => ({ acceptCurrentTerms: (...a) => acceptMock(...a) }));

import TermsGate from "../TermsGate";

function renderGate() {
  return render(
    <MemoryRouter>
      <TermsGate>
        <p>conteúdo privado</p>
      </TermsGate>
    </MemoryRouter>
  );
}

beforeEach(() => {
  acceptMock.mockClear().mockResolvedValue(undefined);
  auth.user = { uid: "u1" };
  auth.profile = null;
  auth.reloadProfile = vi.fn().mockImplementation(async () => {
    auth.profile = { termsVersion: TERMS_VERSION };
  });
});

describe("TermsGate", () => {
  it("deslogado → children direto (navegação não trava)", () => {
    auth.user = null;
    renderGate();
    expect(screen.getByText("conteúdo privado")).toBeInTheDocument();
  });

  it("perfil na versão vigente → children direto", () => {
    auth.profile = { termsVersion: TERMS_VERSION };
    renderGate();
    expect(screen.getByText("conteúdo privado")).toBeInTheDocument();
  });

  it("versão antiga → mostra o gate e esconde o conteúdo", () => {
    auth.profile = { termsVersion: "2026-07-13" };
    renderGate();

    expect(screen.queryByText("conteúdo privado")).not.toBeInTheDocument();
    expect(screen.getByText("Atualizamos nossos termos")).toBeInTheDocument();
    // Botão desabilitado sem o checkbox
    expect(screen.getByRole("button", { name: /aceitar/i })).toBeDisabled();
  });

  it("aceitar registra a versão e libera o conteúdo", async () => {
    auth.profile = { termsVersion: "2026-07-13" };
    const { rerender } = renderGate();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /aceitar/i }));

    await waitFor(() => expect(acceptMock).toHaveBeenCalledWith("u1"));
    expect(auth.reloadProfile).toHaveBeenCalled();

    // Após o reload, o perfil está na vigente → children aparecem.
    rerender(
      <MemoryRouter>
        <TermsGate>
          <p>conteúdo privado</p>
        </TermsGate>
      </MemoryRouter>
    );
    expect(screen.getByText("conteúdo privado")).toBeInTheDocument();
  });

  it("falha ao aceitar mostra erro e mantém o gate", async () => {
    auth.profile = { termsVersion: null };
    acceptMock.mockRejectedValueOnce(new Error("rede"));
    renderGate();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /aceitar/i }));

    await waitFor(() =>
      expect(screen.getByText(/não foi possível registrar/i)).toBeInTheDocument()
    );
    expect(screen.queryByText("conteúdo privado")).not.toBeInTheDocument();
  });
});
