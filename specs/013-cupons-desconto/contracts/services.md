# Contracts — Serviços & Utilitários (013)

## `utils/coupon.js` (NOVO — puro, testável)

```js
export const COUPON_TYPE = { FIXO: "fixo", PERCENTUAL: "percentual", FRETE_GRATIS: "frete_gratis" };

// Trim + maiúsculas. "" se vazio/nulo.
export function normalizeCode(raw): string

// Status para o badge do admin.
export function couponStatus(coupon, now = Date.now()): "ativo"|"inativo"|"expirado"|"esgotado"

// Decisão de aplicação/revalidação. now em ms.
export function isCouponValid(coupon, { subtotal, now = Date.now() }):
  { ok: true } | { ok: false, error: "inativo"|"expirado"|"esgotado"|"minimo" }

// Cálculo do efeito. subtotal/shipping em centavos.
export function computeCouponEffect(coupon, { subtotal, shipping = 0 }):
  { discount: number, freeShipping: boolean, effectiveShipping: number, total: number }
//  fixo:        discount = min(value, subtotal)
//  percentual:  discount = min(round(subtotal * value/100), subtotal)
//  frete_gratis: discount = 0, freeShipping = true, effectiveShipping = 0
//  total = subtotal - discount + effectiveShipping  (>= 0)

// Validação do formulário do admin (não checa unicidade — o service checa).
export function validateCouponInput(form):
  { ok: boolean, errors: { code?, value?, percent?, dates?, maxUses? } }
```

## `services/couponService.js` (NOVO)

```js
// Todos os cupons (admin). Ordena por createdAt desc (sem índice novo).
export async function listCoupons(): Promise<Coupon[]>

// Um cupom por código (get por id; null se ausente). Usado no checkout.
export async function getCoupon(code): Promise<Coupon|null>

// Cria. Normaliza o código, checa unicidade (getCoupon) e validateCouponInput.
// usedCount:0, createdAt: serverTimestamp(). Lança "codigo-duplicado"/"invalido".
export async function createCoupon(form): Promise<Coupon>

// Edita tudo menos o código (id imutável). updateDoc.
export async function updateCoupon(code, changes): Promise<void>

export async function deleteCoupon(code): Promise<void>
export async function toggleCouponActive(code, active): Promise<void>
```

`Coupon` = shape do data-model (com `id === code`).

## `services/orderService.js` (ALTERADO)

```js
// createOrder ganha o parâmetro couponCode (string|null). Dentro da transação:
//  - lê coupons/{normalizeCode(couponCode)} na fase de LEITURAS (se houver);
//  - após computar o subtotal autoritativo, se há cupom:
//      * isCouponValid(coupon, { subtotal, now }); se !ok → throw serviceError("cupom-invalido", <mensagem por error>);
//      * computeCouponEffect → discount, freeShipping;
//      * grava couponCode = coupon.code, couponType = coupon.type, discount;
//      * shipping efetivo = freeShipping ? 0 : shipping;  shippingStatus recalculado;
//      * total = subtotal - discount + (shipping efetivo || 0);
//  - sem cupom: discount 0, couponCode/couponType null (comportamento atual).
export async function createOrder({ ...atuais, couponCode = null }): Promise<{id, orderNumber}>

// advanceStatus: quando applyingPaid (pago 1ª vez) e order.couponCode:
//  - LEITURA: coupons/{order.couponCode};
//  - ESCRITA: se existe, tx.update(couponRef, { usedCount: (usedCount||0) + 1 });
//  na MESMA transação dos agregados. Guard aggregatesApplied garante 1x.
export async function advanceStatus(id, nextStatus, { byUid, byName }): Promise<void>
```

**Erros novos**: `cupom-invalido` (create), `codigo-duplicado` (createCoupon).

## `firestore.rules` (ALTERADO — deploy manual)

```
match /coupons/{code} {
  allow get: if isSignedIn();
  allow list: if isAdmin();
  allow write: if isAdmin();
}
```
Sem mudança nas demais regras. O incremento de `usedCount` é escrita **admin** (via `advanceStatus` do lojista marcando pago).

## Testes (Princípio II — toca o total/venda)

- `utils/__tests__/coupon.test.js`: normalizeCode; couponStatus (cada estado); isCouponValid (inativo/expirado/esgotado/minimo/ok); computeCouponEffect (fixo com teto, percentual arredondado, frete_gratis, total nunca negativo); validateCouponInput (código vazio, value 0, percent 150, datas invertidas).
- `services/__tests__/couponService.test.js`: create normaliza + unicidade (duplicado lança); get por id; toggle/update/delete (Firestore mockado).
- `services/__tests__/orderService.test.js` (estender): createOrder com couponCode recalcula discount e grava couponCode/couponType/total; cupom inválido → lança "cupom-invalido"; frete_gratis → shipping 0 + shippingStatus "gratis"; advanceStatus incrementa usedCount no pago; **não** incrementa se transição não-pago; pedido sem cupom inalterado.
- `hooks/__tests__/useCheckout.test.jsx` (estender): applyCoupon válido → discount + total; inválido → couponError; frete_gratis → frete 0 no resumo; removeCoupon volta o total; confirm passa couponCode ao createOrder; createOrder "cupom-invalido" → mensagem + cupom removido.
