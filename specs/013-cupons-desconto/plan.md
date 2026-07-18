# Implementation Plan: Cupons de Desconto (013)

**Branch**: `013-cupons-desconto` | **Date**: 2026-07-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-cupons-desconto/spec.md`

## Summary

Adicionar **cupons de desconto** por código: o lojista gerencia cupons numa nova tela do admin e o cliente aplica um código no checkout, com o desconto entrando na composição `total = subtotal + frete − desconto` que a M4a/M5a já montam. 100% client + Firestore + regras — **sem Blaze**. Três tipos (clarify 2026-07-17): **valor fixo**, **percentual** (ambos sobre o subtotal) e **frete grátis** (zera o frete do pedido). Limite de uso **total por cupom**, contado **no `pago`** (reusando o gancho de agregados-no-pago do M4a).

Decisões de segurança-chave: (1) o `createOrder` **revalida e recalcula o desconto pelo código** dentro da transação — nunca confia no valor de desconto vindo do client (FR-010); (2) o incremento de `usedCount` acontece na **mesma transação admin** do `advanceStatus`→`pago`, protegido pelo guard `aggregatesApplied` que já garante "aplicar uma vez"; (3) a coleção `coupons` tem **leitura por documento (código) para autenticados** e **listagem/escrita só admin** — o cliente valida um código conhecido mas não enumera todos. Cálculo isolado num util puro `utils/coupon.js`, reutilizado por checkout, admin e `orderService` (uma fonte de verdade).

## Technical Context

**Language/Version**: JavaScript (ES Modules), React 19.2 + Vite 8 — sem TypeScript.

**Primary Dependencies**: Firebase SDK 12 (Firestore, `runTransaction`), React Router 7, MUI 9 (admin), CSS Modules + tokens de `variables.css`.

**Storage**: Firestore — **nova coleção `coupons`** (doc id = código normalizado). Pedido ganha campos congelados `couponCode`, `couponType`, `discount`. Reusa `settings`/`orders` existentes.

**Testing**: Vitest 4 + RTL + jsdom; Firestore mockado (padrão do projeto). Cupom toca o **total do pedido** → cobertura obrigatória (Princípio II).

**Target Platform**: Web (loja + admin), responsivo.

**Project Type**: Web app single-frontend, **sem backend** (endurecimento server-side do limite é M4b).

**Performance Goals**: cálculo de desconto local (util puro); validação do cupom = 1 leitura pontual `coupons/{code}` no apply; checkout interativo < 3s (Princípio IV).

**Constraints**: mudança **aditiva** no pedido; **nova regra** para `coupons` (deploy manual do lojista, como no M4a); não quebrar checkout (009), frete (011), carrinho (M2), conta (007), variações (008), vitrine, admin.

**Scale/Scope**: dezenas de cupons no máximo; catálogo pequeno-médio; pré-lançamento.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality** — PASS. Regra de desconto/validação isolada num util puro `utils/coupon.js` (normalização, status, validação, cálculo), reutilizado por checkout, admin e `orderService` — sem duplicar lógica. `couponService` isola o acesso ao Firestore. `oxlint` zero erros.
- **II. Testing Standards** — PASS (obrigatório aqui: toca o total/venda). Testar: cálculo por tipo (fixo com teto, percentual, frete grátis), total nunca negativo; validação (inativo/expirado/esgotado/mínimo); `createOrder` recalcula o desconto pelo código e recusa cupom inválido; `advanceStatus` incrementa `usedCount` no `pago` e **não** incrementa se não pago; `useCheckout` aplica/remove e recompõe o total. Não toca estoque/auth.
- **III. UX Consistency** — PASS. Tela de cupons no admin reusa o padrão de formulários/listas (003/008/011); checkout reusa `FormField`/estados carregando-erro-sucesso; linha de desconto e "frete grátis (cupom)" nos tokens; `docs/design-system.md` ganha a seção de cupons.
- **IV. Performance** — PASS. Cálculo local; 1 leitura pontual por apply (get por id, não list); admin segue code-split (`React.lazy`); sem leitura ilimitada na loja (o cliente nunca lista `coupons`).

Sem violações → Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/013-cupons-desconto/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── services.md   # couponService, util coupon (status/validação/cálculo), orderService (createOrder/advanceStatus), rules
│   └── ui.md         # tela admin de cupons, checkout (campo cupom + linha de desconto), detalhe do pedido
└── checklists/requirements.md
```

### Source Code (repository root)

```text
frontend/src/
├── services/
│   ├── couponService.js                # NOVO — list/get/create/update/delete/toggle na coleção coupons (id = código)
│   └── orderService.js                 # createOrder aceita couponCode e RECALCULA discount/couponType + shipping; advanceStatus incrementa usedCount no pago
├── utils/
│   ├── coupon.js                       # NOVO — normalizeCode, couponStatus, isCouponValid, computeCouponEffect, validateCouponInput
│   └── __tests__/coupon.test.js
├── constants/
│   ├── routes.js                       # + ADMIN_COUPONS ("/admin/cupons")
│   └── coupon.js                        # NOVO — COUPON_TYPE, labels (opcional; pode ficar em utils/coupon.js)
├── hooks/
│   └── useCheckout.js                  # applyCoupon/removeCoupon; discount/freeShipping; total = subtotal − desconto + frete; trata "cupom-invalido" do createOrder
├── pages/
│   ├── Admin/Coupons/index.jsx         # NOVA tela — lista + form (código/tipo/valor/mínimo/validade/limite/ativo) (+ styles)
│   └── Checkout/index.jsx              # campo "cupom", aplicar/remover, linha de desconto + frete grátis por cupom no resumo
│   └── Account/Orders/Detail/index.jsx # linha de desconto na composição do total
├── components/                          # (admin) detalhe do pedido mostra o desconto — arquivo do painel de pedidos
├── layouts/AdminLayout/index.jsx       # + item de nav "Cupons"
└── routes/index.jsx                    # rota /admin/cupons (AdminRoute)

firestore.rules                          # + bloco match /coupons/{code} (get autenticado; list/write admin) — DEPLOY MANUAL
```

**Structure Decision**: single-frontend existente. Nova coleção `coupons` com doc id = **código normalizado** (permite `get` por código sem `list`, protegendo a enumeração — FR-014). O cálculo/validação vive num util puro compartilhado; o `orderService` é a **autoridade** do desconto no momento da criação (FR-010) e do incremento de uso no `pago`. Requer **um bloco novo em `firestore.rules`** (deploy manual do lojista) e **nenhum índice novo** (listagem de cupons é leitura simples ordenada).

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
