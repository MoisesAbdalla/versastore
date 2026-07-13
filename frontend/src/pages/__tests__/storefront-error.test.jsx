import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mocks leves das dependências pesadas do MainLayout/catálogo.
vi.mock("../../hooks/useCatalog", () => ({
  useCatalog: () => ({
    items: [],
    loading: false,
    error: new Error("offline"),
    hasMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    filters: { categoria: "", sub: "", ordenar: "recentes", q: "" },
    setFilters: vi.fn(),
  }),
}));

vi.mock("../../hooks/usePublicCategories", () => ({
  usePublicCategories: () => ({ roots: [], tree: [], subcategoriesOf: () => [], loading: false }),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("../../contexts/CartContext", () => ({
  useCart: () => ({ count: 0 }),
}));

import Products from "../Products";

describe("catálogo — estado de erro (US5/FR-005)", () => {
  it("falha da consulta mostra mensagem e 'tentar novamente', sem quebrar a página", () => {
    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
  });
});
