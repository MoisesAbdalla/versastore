import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import FormField from "../../components/form/FormField";
import Checkbox from "../../components/form/Checkbox";
import EmptyState from "../../components/EmptyState";
import { useCheckout } from "../../hooks/useCheckout";
import { formatBRL } from "../../utils/format";
import ROUTES from "../../constants/routes";
import styles from "./styles.module.css";

const METHOD_LABELS = { pix: "Pix", cartao: "Cartão", boleto: "Boleto" };

const COUPON_MESSAGES = {
  nao_encontrado: "Cupom não encontrado.",
  inativo: "Cupom inválido ou expirado.",
  expirado: "Cupom inválido ou expirado.",
  esgotado: "Cupom esgotado.",
  minimo: "Seu pedido não atinge o valor mínimo deste cupom.",
  erro: "Não foi possível validar o cupom. Tente novamente.",
  invalido_checkout: "O cupom deixou de ser válido.",
};

function changeMessage(change) {
  switch (change.type) {
    case "indisponivel":
      return `"${change.name}" saiu do catálogo e foi removido.`;
    case "esgotado":
      return `"${change.name}" esgotou e foi removido.`;
    case "quantidade":
      return `A quantidade de "${change.name}" foi ajustada para ${change.to}.`;
    case "preco":
      return `O preço de "${change.name}" foi atualizado.`;
    default:
      return null;
  }
}

function Checkout() {
  const c = useCheckout();
  const [couponInput, setCouponInput] = useState("");

  useEffect(() => {
    document.title = "Checkout · Versa Store";
  }, []);

  if (c.isEmpty) {
    return (
      <MainLayout>
        <div className={styles.page}>
          <EmptyState
            title="Seu carrinho está vazio"
            description="Adicione produtos para finalizar a compra."
            actionLabel="Ver produtos"
            actionTo={ROUTES.PRODUCTS}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.page}>
        <h1 className={styles.title}>Finalizar compra</h1>

        <div className={styles.layout}>
          <div className={styles.main}>
            {/* Itens revalidados */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Itens</h2>

              {c.changes.length > 0 && (
                <div className={styles.changes} role="alert">
                  <p className={styles.changesTitle}>Alguns itens mudaram desde que você adicionou:</p>
                  <ul>
                    {c.changes.map((ch, i) => (
                      <li key={i}>{changeMessage(ch)}</li>
                    ))}
                  </ul>
                  {!c.acknowledged && (
                    <button type="button" className={styles.ackBtn} onClick={c.acknowledge}>
                      Revisei, pode continuar
                    </button>
                  )}
                </div>
              )}

              <ul className={styles.items}>
                {c.items.map((item) => (
                  <li key={item.lineId} className={styles.item}>
                    <span className={styles.itemName}>
                      {item.name}
                      {item.variationLabel && <span className={styles.itemVar}> · {item.variationLabel}</span>}
                      <span className={styles.itemQty}> × {item.quantity}</span>
                    </span>
                    <span>{formatBRL(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Forma de recebimento (feature 016) */}
            {c.pickupAvailable && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Como você quer receber?</h2>
                <div className={styles.methods}>
                  <label className={styles.methodOption} data-selected={!c.isPickup}>
                    <input
                      type="radio"
                      name="delivery"
                      checked={!c.isPickup}
                      onChange={() => c.setDeliveryMethod("entrega")}
                    />
                    Receber em casa
                  </label>
                  <label className={styles.methodOption} data-selected={c.isPickup}>
                    <input
                      type="radio"
                      name="delivery"
                      checked={c.isPickup}
                      onChange={() => c.setDeliveryMethod("retirada")}
                    />
                    Retirar na loja (grátis)
                  </label>
                </div>
                {c.isPickup && (
                  <p className={styles.pickupAddress}>
                    <strong>Endereço para retirada:</strong> {c.pickupAddress}
                  </p>
                )}
              </section>
            )}

            {/* Endereço */}
            {!c.isPickup && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Endereço de entrega</h2>

              {!c.hasAddress ? (
                <div className={styles.noAddress}>
                  <p>Você ainda não tem um endereço salvo.</p>
                  <Link className={styles.link} to={ROUTES.CONTA_ENDERECOS}>
                    Cadastrar endereço
                  </Link>
                </div>
              ) : (
                <div className={styles.addresses}>
                  {c.addresses.map((addr) => (
                    <label key={addr.id} className={styles.addressOption}>
                      <input
                        type="radio"
                        name="address"
                        checked={c.selectedAddressId === addr.id}
                        onChange={() => c.selectAddress(addr.id)}
                      />
                      <span>
                        {addr.street}, {addr.number}
                        {addr.complement ? ` — ${addr.complement}` : ""} · {addr.neighborhood} —{" "}
                        {addr.city}/{addr.state} · CEP {addr.cep}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>
            )}

            {/* CPF */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>CPF do comprador</h2>
              <FormField
                label="CPF"
                value={c.cpf}
                onChange={c.setCpf}
                onBlur={c.blurCpf}
                error={c.cpfError}
                touched={Boolean(c.cpfError)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
              />
              <Checkbox checked={c.saveCpfOptIn} onChange={c.setSaveCpfOptIn}>
                Salvar meu CPF para as próximas compras
              </Checkbox>
            </section>

            {/* Método de pagamento */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Forma de pagamento</h2>
              <div className={styles.methods}>
                {c.methods.map((m) => (
                  <label key={m} className={styles.methodOption} data-selected={c.paymentMethod === m}>
                    <input
                      type="radio"
                      name="method"
                      checked={c.paymentMethod === m}
                      onChange={() => c.setPaymentMethod(m)}
                    />
                    {METHOD_LABELS[m]}
                  </label>
                ))}
              </div>
              <p className={styles.methodHint}>
                O pagamento será gerado em seguida — nesta etapa você só escolhe a forma.
              </p>
            </section>
          </div>

          {/* Resumo */}
          <aside className={styles.summary}>
            <h2 className={styles.sectionTitle}>Resumo</h2>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{formatBRL(c.subtotal)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Frete</span>
              <span className={styles.muted}>
                {c.freeShipping ? "Frete grátis (cupom)" : c.shippingLabel}
              </span>
            </div>

            {c.discount > 0 && (
              <div className={styles.summaryRow}>
                <span>Desconto{c.appliedCoupon ? ` (${c.appliedCoupon.code})` : ""}</span>
                <span className={styles.discount}>−{formatBRL(c.discount)}</span>
              </div>
            )}

            {/* Cupom de desconto (feature 013) */}
            <div className={styles.coupon}>
              {c.appliedCoupon ? (
                <div className={styles.couponApplied}>
                  <span>
                    Cupom <strong>{c.appliedCoupon.code}</strong> aplicado
                  </span>
                  <button type="button" className={styles.couponRemove} onClick={c.removeCoupon}>
                    Remover
                  </button>
                </div>
              ) : (
                <div className={styles.couponRow}>
                  <input
                    type="text"
                    className={styles.couponInput}
                    placeholder="Cupom de desconto"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    aria-label="Cupom de desconto"
                  />
                  <button
                    type="button"
                    className={styles.couponApply}
                    onClick={() => c.applyCoupon(couponInput)}
                    disabled={!couponInput.trim()}
                  >
                    Aplicar
                  </button>
                </div>
              )}
              {c.couponError && (
                <p className={styles.couponError} role="alert">
                  {COUPON_MESSAGES[c.couponError] || "Cupom inválido."}
                </p>
              )}
            </div>

            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total</span>
              <span>{formatBRL(c.total)}</span>
            </div>

            {c.submitError && (
              <p className={styles.error} role="alert">
                {c.submitError}
              </p>
            )}

            <button
              type="button"
              className={styles.confirm}
              onClick={c.confirm}
              disabled={!c.canConfirm}
            >
              {c.submitting ? "Criando pedido…" : "Confirmar pedido"}
            </button>

            {!c.isPickup && !c.hasAddress && (
              <p className={styles.blockHint}>Cadastre um endereço para continuar.</p>
            )}
            {c.mustReview && <p className={styles.blockHint}>Revise as mudanças dos itens acima.</p>}
            {!c.isPickup && c.shippingError === "sem_regra" && (
              <p className={styles.blockHint}>Ainda não entregamos para o CEP deste endereço.</p>
            )}
            {!c.isPickup && c.shippingError === "erro" && (
              <p className={styles.blockHint}>Não foi possível calcular o frete. Tente novamente.</p>
            )}
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

export default Checkout;
