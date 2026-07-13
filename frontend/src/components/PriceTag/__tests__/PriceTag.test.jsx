import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PriceTag from "../index";

function normalize(text) {
  return text.replace(/ /g, " ");
}

describe("PriceTag", () => {
  it("promoção vigente mostra riscado + promocional + % (SC-003)", () => {
    render(<PriceTag product={{ price: 10000, promoPrice: 8000 }} />);

    // R$ 100,00 riscado, R$ 80,00 destaque, -20%
    expect(normalize(screen.getByText(/100,00/).textContent)).toContain("R$ 100,00");
    expect(normalize(screen.getByText(/80,00/).textContent)).toContain("R$ 80,00");
    expect(screen.getByText("-20%")).toBeInTheDocument();
  });

  it("sem promoção mostra apenas o preço normal", () => {
    render(<PriceTag product={{ price: 10000, promoPrice: null }} />);

    expect(normalize(screen.getByText(/100,00/).textContent)).toContain("R$ 100,00");
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it("promoção expirada mostra apenas o preço normal (fora de vigência)", () => {
    render(
      <PriceTag
        product={{
          price: 10000,
          promoPrice: 8000,
          promoStart: new Date("2026-06-01T00:00:00-03:00"),
          promoEnd: new Date("2026-06-30T23:59:59-03:00"),
        }}
      />
    );

    // Hoje (data real do teste) está fora de junho/2026 → sem desconto.
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });
});
