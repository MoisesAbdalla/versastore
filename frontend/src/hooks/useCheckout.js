import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { createOrder } from "../services/orderService";
import { createPayment } from "../services/paymentProvider";
import { saveCpf } from "../services/userService";
import { validateCpf, maskCpf } from "../utils/validation";
import ROUTES from "../constants/routes";

const PAYMENT_METHODS = ["pix", "cartao", "boleto"];

// Estado do checkout (feature 009 / M4a): revalida o carrinho, seleciona
// endereço, coleta CPF (opt-in), escolhe método e cria o pedido pendente.
export function useCheckout() {
  const navigate = useNavigate();
  const { items, subtotal, revalidate, clear } = useCart();
  const { user, profile, reloadProfile } = useAuth();

  const addresses = useMemo(() => profile?.addresses || [], [profile]);

  const [revalidating, setRevalidating] = useState(true);
  const [changes, setChanges] = useState([]);
  const [acknowledged, setAcknowledged] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [cpf, setCpf] = useState("");
  const [saveCpfOptIn, setSaveCpfOptIn] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [cpfTouched, setCpfTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Revalida o carrinho ao montar (reusa a revalidação do M2).
  useEffect(() => {
    let cancelled = false;

    revalidate()
      .then((result) => {
        if (!cancelled) {
          setChanges(result);
        }
      })
      .catch(() => {
        // Falha de rede: segue com o carrinho salvo; a criação revalida o estoque.
      })
      .finally(() => {
        if (!cancelled) {
          setRevalidating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revalidate]);

  // Pré-seleciona o endereço padrão e pré-preenche o CPF salvo no perfil.
  useEffect(() => {
    if (selectedAddressId == null && addresses.length) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  // Pré-preenche o CPF salvo UMA única vez (quando o perfil carrega). Depois
  // disso — inclusive se o cliente apagar o campo para digitar outro — nunca
  // repreenche, senão seria impossível trocar de CPF.
  const cpfPrefilledRef = useRef(false);

  useEffect(() => {
    if (!cpfPrefilledRef.current && profile?.cpf) {
      setCpf(maskCpf(profile.cpf));
      cpfPrefilledRef.current = true;
    }
  }, [profile]);

  const cpfError = cpfTouched ? validateCpf(cpf) : null;
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;
  const hasAddress = addresses.length > 0;
  const isEmpty = !revalidating && items.length === 0;
  const mustReview = changes.length > 0 && !acknowledged;

  const canConfirm =
    !submitting &&
    !revalidating &&
    items.length > 0 &&
    !mustReview &&
    Boolean(selectedAddress) &&
    validateCpf(cpf) === null &&
    PAYMENT_METHODS.includes(paymentMethod);

  const setCpfMasked = useCallback((value) => {
    // O cliente editou → não repreencher mais com o CPF salvo (permite trocar).
    cpfPrefilledRef.current = true;
    setCpf(maskCpf(value));
  }, []);

  const confirm = useCallback(async () => {
    if (!canConfirm || !user) {
      setCpfTouched(true);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        variationId: item.variationId || null,
        quantity: item.quantity,
      }));

      const { id, orderNumber } = await createOrder({
        customerId: user.uid,
        items: orderItems,
        shippingAddress: selectedAddress,
        paymentMethod,
        cpf,
      });

      // Ponto de integração do pagamento (stub na M4a; Mercado Pago no M4b).
      await createPayment({ id, orderNumber });

      if (saveCpfOptIn) {
        await saveCpf(user.uid, cpf);
        await reloadProfile();
      }

      clear();
      navigate(ROUTES.CHECKOUT_SUCCESS, { state: { orderNumber } });
    } catch (error) {
      setSubmitError(
        error.code === "estoque-insuficiente"
          ? "O estoque de um item mudou. Revise o carrinho e tente de novo."
          : "Não foi possível criar o pedido. Tente novamente."
      );
      setSubmitting(false);
    }
  }, [
    canConfirm,
    user,
    items,
    selectedAddress,
    paymentMethod,
    cpf,
    saveCpfOptIn,
    clear,
    navigate,
    reloadProfile,
  ]);

  return {
    // carrinho
    items,
    subtotal,
    shippingLabel: "A combinar",
    total: subtotal, // shipping "a combinar" (0) → total = subtotal na M4a
    revalidating,
    changes,
    acknowledged,
    acknowledge: () => setAcknowledged(true),
    mustReview,
    isEmpty,
    // endereço
    addresses,
    selectedAddressId,
    selectAddress: setSelectedAddressId,
    selectedAddress,
    hasAddress,
    // cpf
    cpf,
    setCpf: setCpfMasked,
    cpfError,
    blurCpf: () => setCpfTouched(true),
    saveCpfOptIn,
    setSaveCpfOptIn,
    // método
    paymentMethod,
    setPaymentMethod,
    methods: PAYMENT_METHODS,
    // confirmar
    canConfirm,
    confirm,
    submitting,
    submitError,
  };
}
