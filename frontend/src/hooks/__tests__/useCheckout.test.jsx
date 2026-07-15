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

vi.mock("../../contexts/CartContext", () => ({ useCart: () => cart }));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../services/orderService", () => ({ createOrder: (...a) => createOrderMock(...a) }));
vi.mock("../../services/paymentProvider", () => ({ createPayment: (...a) => createPaymentMock(...a) }));
vi.mock("../../services/userService", () => ({ saveCpf: (...a) => saveCpfMock(...a) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));

import { useCheckout } from "../useCheckout";

beforeEach(() => {
  cart.revalidate.mockClear().mockResolvedValue([]);
  cart.clear.mockClear();
  navigateMock.mockClear();
  createOrderMock.mockClear().mockResolvedValue({ id: "order-1", orderNumber: 7 });
  createPaymentMock.mockClear();
  saveCpfMock.mockClear();
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

  it("canConfirm só com endereço + CPF válido + método", async () => {
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.revalidating).toBe(false));

    expect(result.current.canConfirm).toBe(false); // sem CPF

    act(() => result.current.setCpf("111.111.111-11"));
    expect(result.current.canConfirm).toBe(false); // CPF inválido

    act(() => result.current.setCpf(VALID_CPF));
    expect(result.current.canConfirm).toBe(true);
  });

  it("confirm cria o pedido com os dados certos, esvazia o carrinho e navega", async () => {
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.revalidating).toBe(false));
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
    });
    expect(createPaymentMock).toHaveBeenCalled();
    expect(cart.clear).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/checkout/sucesso", { state: { orderNumber: 7 } });
  });

  it("salva o CPF só com opt-in", async () => {
    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.revalidating).toBe(false));
    act(() => result.current.setCpf(VALID_CPF));
    act(() => result.current.setSaveCpfOptIn(true));

    await act(async () => {
      await result.current.confirm();
    });

    expect(saveCpfMock).toHaveBeenCalledWith("u1", VALID_CPF);
  });

  it("mudança na revalidação bloqueia até revisar", async () => {
    cart.revalidate.mockResolvedValueOnce([{ name: "Boné", type: "preco" }]);

    const { result } = renderHook(() => useCheckout());
    await waitFor(() => expect(result.current.revalidating).toBe(false));
    act(() => result.current.setCpf(VALID_CPF));

    expect(result.current.mustReview).toBe(true);
    expect(result.current.canConfirm).toBe(false);

    act(() => result.current.acknowledge());
    expect(result.current.canConfirm).toBe(true);
  });
});
