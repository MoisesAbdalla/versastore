import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PriceTag from "../../components/PriceTag";
import { effectivePrice } from "../promo";

// Integração da promoção entre superfícies (US4). PriceTag é a superfície
// compartilhada por card e página; effectivePrice alimenta card, página e o
// unitPrice do carrinho. A vigência por fuso (SC-003) é testada em promo.test.js.

function pastWindow() {
  return {
    price: 10000,
    promoPrice: 8000,
    promoStart: new Date("2020-01-01T00:00:00-03:00"),
    promoEnd: new Date("2020-01-31T23:59:59-03:00"),
  };
}

function futureWindow() {
  return {
    price: 10000,
    promoPrice: 8000,
    promoStart: new Date("2090-01-01T00:00:00-03:00"),
    promoEnd: new Date("2090-01-31T23:59:59-03:00"),
  };
}

describe("promoção — integração entre superfícies (US4)", () => {
  it("promoção vigente (sem datas) aparece no card (md) e na página (lg)", () => {
    const product = { price: 10000, promoPrice: 8000 };

    const { rerender } = render(<PriceTag product={product} />);
    expect(screen.getByText("-20%")).toBeInTheDocument();

    rerender(<PriceTag product={product} size="lg" />);
    expect(screen.getByText("-20%")).toBeInTheDocument();
  });

  it("promoção expirada não renderiza desconto (antes/depois da janela)", () => {
    render(<PriceTag product={pastWindow()} />);

    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it("promoção futura não renderiza desconto", () => {
    render(<PriceTag product={futureWindow()} />);

    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it("effectivePrice (fonte do unitPrice do carrinho) segue a vigência", () => {
    expect(effectivePrice({ price: 10000, promoPrice: 8000 }).price).toBe(8000);
    expect(effectivePrice(pastWindow()).price).toBe(10000);
    expect(effectivePrice(futureWindow()).price).toBe(10000);
  });
});
