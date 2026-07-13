import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const useAuthMock = vi.fn();
const logoutMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../services/authService", () => ({
  logout: (...args) => logoutMock(...args),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

import UserMenu from "../index";

function renderMenu() {
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>
  );
}

describe("UserMenu (feature 007)", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    logoutMock.mockReset();
    navigateMock.mockReset();
    useAuthMock.mockReturnValue({ user: { email: "ana@exemplo.com" }, isAdmin: false });
  });

  it("mostra o nome/e-mail e abre o menu ao clicar", () => {
    renderMenu();

    const trigger = screen.getByRole("button", { name: /ana@exemplo.com/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Minha conta" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Meus pedidos" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Meus endereços" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sair" })).toBeInTheDocument();
  });

  it("não mostra 'Painel admin' para cliente comum", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button"));

    expect(screen.queryByRole("menuitem", { name: "Painel admin" })).not.toBeInTheDocument();
  });

  it("mostra 'Painel admin' quando o usuário é admin", () => {
    useAuthMock.mockReturnValue({ user: { email: "chefe@exemplo.com" }, isAdmin: true });

    renderMenu();
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("menuitem", { name: "Painel admin" })).toBeInTheDocument();
  });

  it("aponta os itens para as abas da conta", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("menuitem", { name: "Minha conta" })).toHaveAttribute("href", "/conta");
    expect(screen.getByRole("menuitem", { name: "Meus pedidos" })).toHaveAttribute(
      "href",
      "/conta/pedidos"
    );
    expect(screen.getByRole("menuitem", { name: "Meus endereços" })).toHaveAttribute(
      "href",
      "/conta/enderecos"
    );
  });

  it("Sair faz logout e volta para a home", async () => {
    logoutMock.mockResolvedValue(undefined);

    renderMenu();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sair" }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
  });

  it("fecha ao apertar Escape", () => {
    renderMenu();
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
