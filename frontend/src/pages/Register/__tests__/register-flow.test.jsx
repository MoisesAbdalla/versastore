import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const registerMock = vi.fn();
const loginWithGoogleMock = vi.fn();
const setUserMock = vi.fn();
const reloadProfileMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../../../layouts/MainLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../../../services/authService", () => ({
  register: (...args) => registerMock(...args),
  loginWithGoogle: (...args) => loginWithGoogleMock(...args),
}));

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ setUser: setUserMock, reloadProfile: reloadProfileMock }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

import Register from "../index";

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });
}

describe("Register — fluxo de cadastro (US1/US2)", () => {
  beforeEach(() => {
    registerMock.mockReset();
    setUserMock.mockReset();
    reloadProfileMock.mockReset();
    navigateMock.mockReset();
  });

  it("grava o nome completo e conclui o cadastro navegando para a home", async () => {
    registerMock.mockResolvedValue({ uid: "u1" });
    reloadProfileMock.mockResolvedValue({ name: "Maria Silva", phone: "11912345678" });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fill("Nome completo", "Maria Silva");
    fill("E-mail", "maria@exemplo.com");
    fill("Telefone", "11912345678");
    fireEvent.change(screen.getByLabelText("Senha", { exact: true }), { target: { value: "senha1234" } });
    fill("Confirmar senha", "senha1234");
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Maria Silva",
        email: "maria@exemplo.com",
        password: "senha1234",
        termsAccepted: true,
      })
    );
    expect(setUserMock).toHaveBeenCalledWith({ uid: "u1" });
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
  });

  it("não envia o cadastro sem o aceite dos termos e mostra o erro do campo", async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fill("Nome completo", "Maria Silva");
    fill("E-mail", "maria@exemplo.com");
    fill("Telefone", "11912345678");
    fireEvent.change(screen.getByLabelText("Senha", { exact: true }), { target: { value: "senha1234" } });
    fill("Confirmar senha", "senha1234");

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    await waitFor(() =>
      expect(screen.getByText(/aceitar os termos/i)).toBeInTheDocument()
    );
    expect(registerMock).not.toHaveBeenCalled();
  });
});
