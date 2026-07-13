import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const useAuthMock = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import CompleteProfileGuard from "../CompleteProfileGuard";

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/completar-cadastro"]}>
      <Routes>
        <Route
          path="/completar-cadastro"
          element={
            <CompleteProfileGuard>
              <div>complete seu cadastro</div>
            </CompleteProfileGuard>
          }
        />
        <Route path="/login" element={<div>tela de login</div>} />
        <Route path="/" element={<div>página inicial</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("CompleteProfileGuard", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("renderiza o passo para usuário logado com cadastro incompleto", () => {
    useAuthMock.mockReturnValue({ user: { uid: "u1" }, profileIncomplete: true, loading: false });

    renderGuard();

    expect(screen.getByText("complete seu cadastro")).toBeInTheDocument();
  });

  it("redireciona para a home quando o cadastro já está completo", () => {
    useAuthMock.mockReturnValue({ user: { uid: "u1" }, profileIncomplete: false, loading: false });

    renderGuard();

    expect(screen.getByText("página inicial")).toBeInTheDocument();
    expect(screen.queryByText("complete seu cadastro")).not.toBeInTheDocument();
  });

  it("envia visitante não autenticado para o login", () => {
    useAuthMock.mockReturnValue({ user: null, profileIncomplete: false, loading: false });

    renderGuard();

    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("não renderiza nada enquanto a sessão ainda está carregando", () => {
    useAuthMock.mockReturnValue({ user: null, profileIncomplete: false, loading: true });

    const { container } = renderGuard();

    expect(container).toBeEmptyDOMElement();
  });
});
