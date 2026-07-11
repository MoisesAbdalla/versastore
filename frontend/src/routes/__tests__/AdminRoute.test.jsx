import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const useAuthMock = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import AdminRoute from "../AdminRoute";

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>painel administrativo</div>
            </AdminRoute>
          }
        />
        <Route path="/login" element={<div>tela de login</div>} />
        <Route path="/acesso-negado" element={<div>acesso não autorizado</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("renderiza o painel para usuário com papel de administrador", () => {
    useAuthMock.mockReturnValue({ user: { uid: "u1" }, isAdmin: true, loading: false });

    renderAdminRoute();

    expect(screen.getByText("painel administrativo")).toBeInTheDocument();
  });

  it("redireciona usuário autenticado sem papel admin para a mensagem de acesso negado", () => {
    useAuthMock.mockReturnValue({ user: { uid: "u2" }, isAdmin: false, loading: false });

    renderAdminRoute();

    expect(screen.getByText("acesso não autorizado")).toBeInTheDocument();
    expect(screen.queryByText("painel administrativo")).not.toBeInTheDocument();
  });

  it("envia visitante não autenticado para o login", () => {
    useAuthMock.mockReturnValue({ user: null, isAdmin: false, loading: false });

    renderAdminRoute();

    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("não renderiza nada enquanto o papel ainda está carregando (evita flash)", () => {
    useAuthMock.mockReturnValue({ user: null, isAdmin: false, loading: true });

    const { container } = renderAdminRoute();

    expect(container).toBeEmptyDOMElement();
  });
});
