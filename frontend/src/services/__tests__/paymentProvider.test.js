import { describe, it, expect } from "vitest";
import { createPayment } from "../paymentProvider";

describe("paymentProvider (stub M4a)", () => {
  it("retorna pendente sem processar cobrança", async () => {
    const result = await createPayment({ id: "order-1" });
    expect(result).toMatchObject({ status: "pendente", provider: "stub", orderId: "order-1" });
  });
});
