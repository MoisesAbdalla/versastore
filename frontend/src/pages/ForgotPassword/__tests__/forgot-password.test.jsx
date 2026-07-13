import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const resetPasswordMock = vi.fn();

vi.mock("../../../layouts/MainLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../../../services/authService", () => ({
  resetPassword: (...args) => resetPasswordMock(...args),
}));

import ForgotPassword from "../index";

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );
}

describe("ForgotPassword — recuperação de senha (US3/SC-005)", () => {
  beforeEach(() => {
    resetPasswordMock.mockReset();
  });

  it("envia o e-mail e mostra a confirmação neutra", async () => {
    resetPasswordMock.mockResolvedValue(undefined);

    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail", { exact: false }), {
      target: { value: "maria@exemplo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));

    await waitFor(() => expect(resetPasswordMock).toHaveBeenCalledWith("maria@exemplo.com"));
    expect(screen.getByText(/se houver uma conta com esse e-mail/i)).toBeInTheDocument();
  });

  it("não envia com e-mail inválido e mostra o erro do campo", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail", { exact: false }), {
      target: { value: "invalido" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));

    await waitFor(() => expect(screen.getByText(/e-mail inválido/i)).toBeInTheDocument());
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});
