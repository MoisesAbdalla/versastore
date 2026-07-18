import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { createOrder } from "../services/orderService";
import { createPayment } from "../services/paymentProvider";
import { quote } from "../services/shippingProvider";
import { getCoupon } from "../services/couponService";
import { saveCpf } from "../services/userService";
import { validateCpf, maskCpf } from "../utils/validation";
import { isCouponValid, computeCouponEffect } from "../utils/coupon";
import { formatBRL } from "../utils/format";
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

  // Frete (feature 011 / M5a): calcula pelo CEP do endereço selecionado; recalcula
  // ao trocar de endereço ou mudar o subtotal.
  const cep = selectedAddress?.cep || "";
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  useEffect(() => {
    if (!cep || items.length === 0) {
      setShippingQuote(null);
      return undefined;
    }

    let cancelled = false;
    setShippingLoading(true);

    quote({ cep, subtotal })
      .then((result) => {
        if (!cancelled) setShippingQuote(result);
      })
      .catch(() => {
        if (!cancelled) setShippingQuote({ ok: false, error: "erro" });
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cep, subtotal, items.length]);

  const shippingOption = shippingQuote?.ok ? shippingQuote.options[0] : null;
  const shippingError = shippingQuote && !shippingQuote.ok ? shippingQuote.error : null;
  // sem_config = loja sem tabela → "a combinar" (fallback M4a), NÃO bloqueia.
  // sem_regra/erro = não dá pra cobrar certo → bloqueia.
  const shippingBlocked = shippingError === "sem_regra" || shippingError === "erro";
  const shipping = shippingOption ? shippingOption.price : null; // null = a combinar
  const shippingEtaDays = shippingOption?.etaDays ?? null;
  const shippingMethod = shippingOption?.method || "";

  // Cupom (feature 013): aplica/remove no checkout; o desconto entra no total.
  // A revalidação definitiva é do createOrder (autoridade) na finalização.
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);

  const couponEffect =
    appliedCoupon && isCouponValid(appliedCoupon, { subtotal }).ok
      ? computeCouponEffect(appliedCoupon, { subtotal, shipping: shipping || 0 })
      : null;
  const discount = couponEffect ? couponEffect.discount : 0;
  const freeShipping = couponEffect ? couponEffect.freeShipping : false;

  const total = subtotal - discount + (freeShipping ? 0 : shipping || 0);

  const applyCoupon = useCallback(
    async (rawCode) => {
      setCouponError(null);

      if (!rawCode || !rawCode.trim()) {
        return;
      }

      let coupon = null;
      try {
        coupon = await getCoupon(rawCode);
      } catch {
        setCouponError("erro");
        return;
      }

      if (!coupon) {
        setAppliedCoupon(null);
        setCouponError("nao_encontrado");
        return;
      }

      const check = isCouponValid(coupon, { subtotal });
      if (!check.ok) {
        setAppliedCoupon(null);
        setCouponError(check.error);
        return;
      }

      setAppliedCoupon(coupon);
    },
    [subtotal]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponError(null);
  }, []);

  let shippingLabel;
  if (shippingLoading) {
    shippingLabel = "Calculando…";
  } else if (shippingOption?.free) {
    shippingLabel = "Frete grátis";
  } else if (shippingOption) {
    shippingLabel = `${formatBRL(shippingOption.price)}${
      shippingOption.etaDays ? ` · até ${shippingOption.etaDays} dias úteis` : ""
    }`;
  } else if (shippingError === "sem_regra") {
    shippingLabel = "Ainda não entregamos nessa região";
  } else {
    shippingLabel = "A combinar";
  }

  const canConfirm =
    !submitting &&
    !revalidating &&
    !shippingLoading &&
    !shippingBlocked &&
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
        shipping,
        shippingEtaDays,
        shippingMethod,
        shippingCep: cep,
        couponCode: appliedCoupon?.code || null,
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
      if (error.code === "cupom-invalido") {
        // O cupom deixou de valer entre aplicar e finalizar (FR-010): remove e avisa.
        setAppliedCoupon(null);
        setCouponError("invalido_checkout");
        setSubmitError("O cupom deixou de ser válido. Revise o pedido e tente novamente.");
      } else {
        setSubmitError(
          error.code === "estoque-insuficiente"
            ? "O estoque de um item mudou. Revise o carrinho e tente de novo."
            : "Não foi possível criar o pedido. Tente novamente."
        );
      }
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
    shipping,
    shippingEtaDays,
    shippingMethod,
    cep,
    appliedCoupon,
    clear,
    navigate,
    reloadProfile,
  ]);

  return {
    // carrinho
    items,
    subtotal,
    shippingLabel,
    shipping,
    shippingEtaDays,
    shippingError,
    shippingBlocked,
    shippingLoading,
    total,
    // cupom
    appliedCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    discount,
    freeShipping,
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
