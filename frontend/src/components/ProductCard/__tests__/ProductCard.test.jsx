import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ProductCard from "../index";

function renderCard(product) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>
  );
}

const base = {
  id: "p1",
  name: "Tênis Nike",
  categoryName: "Calçados",
  price: 19990,
  image: "https://res.cloudinary.com/stmjt15v/image/upload/v1/versa/tenis.jpg",
  totalStock: 5,
  variations: [],
};

describe("ProductCard (vitrine)", () => {
  it("linka para a página do produto", () => {
    renderCard(base);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/product/p1");
  });

  it("serve a imagem transformada pelo Cloudinary (w do card)", () => {
    renderCard(base);

    expect(screen.getByAltText("Tênis Nike").getAttribute("src")).toContain(
      "f_auto,q_auto,w_400"
    );
  });

  it("mostra badge Esgotado quando totalStock é 0 (D1)", () => {
    renderCard({ ...base, totalStock: 0, stock: 0 });

    expect(screen.getByText("Esgotado")).toBeInTheDocument();
  });

  it("não mostra Esgotado quando há estoque", () => {
    renderCard(base);

    expect(screen.queryByText("Esgotado")).not.toBeInTheDocument();
  });

  it("exibe o preço promocional vigente (via PriceTag)", () => {
    renderCard({ ...base, promoPrice: 14990 });

    expect(screen.getByText("-25%")).toBeInTheDocument();
  });
});
