import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const cart = {
  items: [{ lineId: "p1", productId: "p1", variationId: null, name: "Boné", unitPrice: 5000, quantity: 2 }],
  subtotal: 10000,
  revalidate: vi.fn().mockResolvedValue([]),
  clear: vi.fn(),
};
const auth = {
  user: { uid: "u1" },
  profile: { addresses: [{ id: "a1", isDefault: true, street: "Rua X", number: "1", city: "SP", state: "SP", cep: "01001-000", neighborhood: "Centro" }], cpf: "" },
  reloadProfile: vi.fn().mockResolvedValue(null),
};
const navigateMock = vi.fn();
const createOrderMock = vi.fn().mockResolvedValue({ id: "order-1", orderNumber: 7 });
const createPaymentMock = vi.fn().mockResolvedValue({ status: "pendente" });
const saveCpfMock = vi.fn().mockResolvedValue(undefined);
const quoteMock = vi.fn();
const getCouponMock = vi.fn();
const shippingSettings = { pickup: null };

vi.mock("../useShippingSettings", () => ({
  useShippingSettings: () => ({ ...shippingSettings, loading: false }),
}));
vi.mock("../../contexts/CartContext", () => ({ useCart: () => cart }));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../services/orderService", () => ({ createOrder: (...a) => createOrderMock(...a) }));
vi.mock("../../services/paymentProvider", () => ({ createPayment: (...a) => createPaymentMock(...a) }));
vi.mock("../../services/shippingProvider", () => ({ quote: (...a) => quoteMock(...a) }));
vi.mock("../../services/couponService", () => ({ getCoupon: (...a) => getCouponMock(...a) }));
vi.mock("../../services/userService", () => ({ saveCpf: (...a) => saveCpfMock(...a) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));

import { useCheckout } from "../useCheckout";

const OK_QUOTE = { ok: true, options: [{ method: "Sudeste", price: 1990, etaDays: 5, free: false }] };

beforeEach(() => {
  cart.revalidate.mockClear().mockResolvedValue([]);
  cart.clear.mockClear();
  navigateMock.mockClear();
  createOrderMock.mockClear().mockResolvedValue({ id: "order-1", orderNumber: 7 });
  createPaymentMock.mockClear();
  saveCpfMock.mockClear();
  quoteMock.mockReset().mockResolvedValue(OK_QUOTE);
  getCouponMock.mockReset().mockResolvedValue(null);
  shippingSettings.pickup = null;
  auth.profile = { addresses: auth.profile.addresses, cpf: "" };
});

const VALID_CPF = "529.982.247-25";

describe("useCheckout", () => {
  it("revalida ao montar e pré-seleciona o endereço padrão", async () => {
    const { result } = renderHook(() => useCheckout());

    await waitFor(() => expect(result.current.revalidating).toBe(false));
    expect(cart.revalidate).toHaveBeenCalled();
    expect(result.current.selectedAddressId).toBe("a1");
  });

  it("canConfirm só com endereço + CPF válido + método + frete resolvido", async () => {
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990)); // frete calculado

    expect(result.current.canConfirm).toBe(false); // sem CPF

    act(() => result.current.setCpf("111.111.111-11"));
    expect(result.current.canConfirm).toBe(false); // CPF inválido

    act(() => result.current.setCpf(VALID_CPF));
    await waitFor(() => expect(result.current.canConfirm).toBe(true));
  });

  it("confirm cria o pedido com os dados certos (incl. frete), esvazia e navega", async () => {
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));
    act(() => result.current.setCpf(VALID_CPF));

    await act(async () => {
      await result.current.confirm();
    });

    expect(createOrderMock).toHaveBeenCalledWith({
      customerId: "u1",
      items: [{ productId: "p1", variationId: null, quantity: 2 }],
      shippingAddress: expect.objectContaining({ id: "a1" }),
      paymentMethod: "pix",
      cpf: VALID_CPF,
      shipping: 1990,
      shippingEtaDays: 5,
      shippingMethod: "Sudeste",
      shippingCep: "01001-000",
      couponCode: null,
      deliveryMethod: "entrega",
      pickupAddress: "",
    });
    expect(cart.clear).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/checkout/sucesso", {
      state: { orderNumber: 7, pickupAddress: null },
    });
  });

  it("frete grátis: shipping 0 e total = subtotal", async () => {
    quoteMock.mockResolvedValue({ ok: true, options: [{ method: "Frete grátis", price: 0, etaDays: null, free: true }] });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shippingLabel).toBe("Frete grátis"));
    expect(result.current.shipping).toBe(0);
    expect(result.current.total).toBe(10000);
  });

  it("frete calculado soma no total", async () => {
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));
    expect(result.current.total).toBe(11990); // 10000 + 1990
  });

  it("CEP sem regra bloqueia a confirmação", async () => {
    quoteMock.mockResolvedValue({ ok: false, error: "sem_regra" });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shippingError).toBe("sem_regra"));
    act(() => result.current.setCpf(VALID_CPF));
    expect(result.current.canConfirm).toBe(false);
  });

  it("loja sem tabela (sem_config) mantém 'a combinar' e PERMITE confirmar", async () => {
    quoteMock.mockResolvedValue({ ok: false, error: "sem_config" });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shippingError).toBe("sem_config"));
    act(() => result.current.setCpf(VALID_CPF));
    await waitFor(() => expect(result.current.canConfirm).toBe(true));
    expect(result.current.shippingLabel).toBe("A combinar");
    expect(result.current.total).toBe(10000);
  });

  it("salva o CPF só com opt-in", async () => {
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));
    act(() => result.current.setCpf(VALID_CPF));
    act(() => result.current.setSaveCpfOptIn(true));

    await act(async () => {
      await result.current.confirm();
    });

    expect(saveCpfMock).toHaveBeenCalledWith("u1", VALID_CPF);
  });

  it("pré-preenche o CPF salvo uma vez, mas deixa apagar/trocar (não repreenche)", async () => {
    auth.profile = { addresses: auth.profile.addresses, cpf: "52998224725" };

    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.revalidating).toBe(false));

    // Pré-preenchido (mascarado) a partir do perfil salvo
    await waitFor(() => expect(result.current.cpf).toBe("529.982.247-25"));

    // Cliente apaga tudo para digitar outro → NÃO repreenche
    act(() => result.current.setCpf(""));
    expect(result.current.cpf).toBe("");

    act(() => result.current.setCpf("111.444.777-35"));
    expect(result.current.cpf).toBe("111.444.777-35");
  });

  it("aplica cupom percentual: desconto e total recompostos", async () => {
    getCouponMock.mockResolvedValue({ code: "OFF10", type: "percentual", value: 10, active: true, usedCount: 0 });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));

    await act(async () => {
      await result.current.applyCoupon("off10");
    });

    expect(result.current.appliedCoupon.code).toBe("OFF10");
    expect(result.current.discount).toBe(1000); // 10% de 10000
    expect(result.current.total).toBe(10000 - 1000 + 1990);
  });

  it("cupom inexistente → couponError, sem desconto", async () => {
    getCouponMock.mockResolvedValue(null);
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));

    await act(async () => {
      await result.current.applyCoupon("NADA");
    });

    expect(result.current.couponError).toBe("nao_encontrado");
    expect(result.current.appliedCoupon).toBe(null);
    expect(result.current.discount).toBe(0);
  });

  it("cupom de frete grátis zera o frete no total", async () => {
    getCouponMock.mockResolvedValue({ code: "FRETE", type: "frete_gratis", value: 0, active: true, usedCount: 0 });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));

    await act(async () => {
      await result.current.applyCoupon("FRETE");
    });

    expect(result.current.freeShipping).toBe(true);
    expect(result.current.total).toBe(10000); // frete zerado, sem desconto no subtotal
  });

  it("remover o cupom volta o total", async () => {
    getCouponMock.mockResolvedValue({ code: "OFF10", type: "percentual", value: 10, active: true, usedCount: 0 });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));

    await act(async () => {
      await result.current.applyCoupon("OFF10");
    });
    expect(result.current.total).toBe(10990);

    act(() => result.current.removeCoupon());
    expect(result.current.appliedCoupon).toBe(null);
    expect(result.current.total).toBe(11990);
  });

  it("confirm passa o couponCode aplicado ao createOrder", async () => {
    getCouponMock.mockResolvedValue({ code: "OFF10", type: "percentual", value: 10, active: true, usedCount: 0 });
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));
    act(() => result.current.setCpf(VALID_CPF));

    await act(async () => {
      await result.current.applyCoupon("OFF10");
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({ couponCode: "OFF10" }));
  });

  it("createOrder cupom-invalido → remove o cupom e avisa", async () => {
    getCouponMock.mockResolvedValue({ code: "OFF10", type: "percentual", value: 10, active: true, usedCount: 0 });
    createOrderMock.mockRejectedValueOnce(Object.assign(new Error("x"), { code: "cupom-invalido" }));
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));
    act(() => result.current.setCpf(VALID_CPF));

    await act(async () => {
      await result.current.applyCoupon("OFF10");
    });
    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.appliedCoupon).toBe(null);
    expect(result.current.couponError).toBe("invalido_checkout");
    expect(result.current.submitError).toMatch(/cupom/i);
  });

  it("retirada indisponível quando o lojista não ativou", async () => {
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.revalidating).toBe(false));
    expect(result.current.pickupAvailable).toBe(false);
    expect(result.current.isPickup).toBe(false);
  });

  it("retirada na loja: frete zerado, total = subtotal, confirma sem depender do frete", async () => {
    shippingSettings.pickup = { enabled: true, address: "Rua da Loja, 10 — Centro" };
    quoteMock.mockResolvedValue({ ok: false, error: "sem_regra" }); // frete bloquearia a entrega

    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.revalidating).toBe(false));

    expect(result.current.pickupAvailable).toBe(true);

    act(() => result.current.setDeliveryMethod("retirada"));
    expect(result.current.isPickup).toBe(true);
    expect(result.current.total).toBe(10000); // sem frete
    expect(result.current.shippingLabel).toBe("Retirada na loja · grátis");

    act(() => result.current.setCpf(VALID_CPF));
    await waitFor(() => expect(result.current.canConfirm).toBe(true)); // apesar do sem_regra
  });

  it("confirm de retirada envia deliveryMethod, endereço da loja e frete 0", async () => {
    shippingSettings.pickup = { enabled: true, address: "Rua da Loja, 10" };
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.revalidating).toBe(false));

    act(() => result.current.setDeliveryMethod("retirada"));
    act(() => result.current.setCpf(VALID_CPF));
    await waitFor(() => expect(result.current.canConfirm).toBe(true));

    await act(async () => {
      await result.current.confirm();
    });

    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryMethod: "retirada",
        pickupAddress: "Rua da Loja, 10",
        shipping: 0,
        shippingAddress: null,
        shippingMethod: "Retirada na loja",
      })
    );
    expect(navigateMock).toHaveBeenCalledWith("/checkout/sucesso", {
      state: { orderNumber: 7, pickupAddress: "Rua da Loja, 10" },
    });
  });

  it("mudança na revalidação bloqueia até revisar", async () => {
    cart.revalidate.mockResolvedValueOnce([{ name: "Boné", type: "preco" }]);

    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.shipping).toBe(1990));
    act(() => result.current.setCpf(VALID_CPF));

    expect(result.current.mustReview).toBe(true);
    expect(result.current.canConfirm).toBe(false);

    act(() => result.current.acknowledge());
    await waitFor(() => expect(result.current.canConfirm).toBe(true));
  });
});
