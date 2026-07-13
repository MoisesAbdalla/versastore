import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../hooks/usePublicCategories", () => ({
  usePublicCategories: () => ({
    tree: [
      { id: "c1", name: "Feminino", slug: "feminino", children: [] },
      { id: "c2", name: "Masculino", slug: "masculino", children: [] },
    ],
  }),
}));

import Navbar from "../index";

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Navbar />
    </MemoryRouter>
  );
}

// A classe de ativo é um CSS module hash; o teste checa a presença da classe
// via className truthy comparando cada link.
function activeLinks() {
  return screen
    .getAllByRole("link")
    .filter((el) => el.className && el.className.length > 0)
    .map((el) => el.textContent);
}

describe("Navbar — item ativo respeita o query param (FR-003a)", () => {
  it("em /products?categoria=feminino, só 'Feminino' fica ativo", () => {
    renderAt("/products?categoria=feminino");

    expect(activeLinks()).toEqual(["Feminino"]);
  });

  it("em /products (sem categoria), só 'Produtos' fica ativo", () => {
    renderAt("/products");

    expect(activeLinks()).toEqual(["Produtos"]);
  });

  it("na Home, só 'Home' fica ativo", () => {
    renderAt("/");

    expect(activeLinks()).toEqual(["Home"]);
  });

  it("categoria diferente não ativa as demais", () => {
    renderAt("/products?categoria=masculino");

    expect(activeLinks()).toEqual(["Masculino"]);
  });
});
