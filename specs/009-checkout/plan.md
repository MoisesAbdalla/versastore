# Implementation Plan: Checkout (M4a)

**Branch**: `009-checkout` | **Date**: 2026-07-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-checkout/spec.md`

## Summary

Entregar o checkout do cliente até a criação do pedido `aguardando_pagamento`, **sem processar pagamento**. Uma tela `/checkout` (protegida) revisa o carrinho revalidado (M2), seleciona endereço (M3), coleta+valida CPF (dígitos verificadores, opt-in de salvar no perfil), escolhe método de pagamento (só seleção) e mostra resumo (subtotal + frete "a combinar" + total). Ao confirmar, o pedido é criado transacionalmente **pelo cliente** — congelando itens, baixando estoque e gerando o número — e aparece em "Meus pedidos" (M3).

Duas decisões estruturais do `/clarify` guiam o desenho:

- **Frete preparado para o M5**: o pedido nasce com `shipping` (0/null, status `a_calcular`) e `total = subtotal + shipping`, para o cálculo real (M5) só preencher o campo.
- **Criação segura sem servidor (opção C)**: o cliente cria o pedido + baixa estoque + número; **receita (`dailyStats`) e totais do cliente (`totalSpent`/`orderCount`) movem-se para a transição `pago`**. O `orderService` é refatorado para separar *baixa de estoque (criação)* de *agregados (pago)*; o M4b liga os agregados ao webhook sem reescrever a criação. Pagamento fica atrás de uma **interface `PaymentProvider`** (stub na M4a).

## Technical Context

**Language/Version**: JavaScript (ES Modules), React 19.2 + Vite 8 — sem TypeScript.

**Primary Dependencies**: Firebase SDK 12 (Firestore, Auth), React Router 7, MUI 9 (pontual), CSS Modules + tokens de `variables.css`.

**Storage**: Firestore (`orders`, `products`, `counters/orders`, `users`; `dailyStats` só na transição `pago`). Sem novas coleções.

**Testing**: Vitest 4 + RTL + jsdom; Firestore mockado (padrão 003/005/007/008). O teste transacional do pedido reusa o mock em memória de `orderService.test.js`.

**Target Platform**: Web (loja pública), responsivo, sob `MainLayout`.

**Project Type**: Web app single-frontend, **sem backend** (o pagamento real é M4b/Cloud Functions, fora daqui).

**Performance Goals**: checkout interativo < 3s (Princípio IV); revalidação do carrinho reusa a do M2 (uma leitura por produto).

**Constraints**: nenhuma nova escrita pública além das necessárias à criação do pedido (orders/products-decremento/counter), validadas nas rules; não quebrar carrinho (M2), vitrine, admin, conta (007), variações (008).

**Scale/Scope**: catálogo pequeno-médio; um pedido por checkout; pré-lançamento (a dívida de segurança da criação client-side é fechada no M4b).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality** — PASS. Lógica de checkout num hook (`useCheckout`) separada da tela; validação de CPF em `utils/validation.js` (reuso); pagamento atrás de `PaymentProvider` (interface). Sem duplicar a transação de estoque (refatorada, não copiada). `oxlint` zero erros.
- **II. Testing Standards** — PASS (NON-NEGOTIABLE: toca estoque/pedido). Testes: `validateCpf` (DVs), refactor do `orderService` (criação baixa estoque **sem** agregados; `pago` aplica agregados; cancelamento reverte só se pago), criação bloqueada por estoque insuficiente (atômico), e o fluxo de checkout (endereço/CPF/carrinho vazio bloqueiam confirmar).
- **III. UX Consistency** — PASS. Reusa `FormField`/estados (007), `MainLayout`, tokens; estados carregando/erro/vazio explícitos; `docs/design-system.md` ganha a seção do checkout.
- **IV. Performance** — PASS. Checkout reusa a revalidação do carrinho (sem leitura extra redundante); confirmação numa transação; nada de leitura ilimitada.
- **Security (rules)** — mudança sensível e **escopada**: `orders` create pelo dono (status inicial `aguardando_pagamento`), `products` decremento não-negativo pelo cliente, `counters/orders` +1; **sem** `dailyStats`/`totalSpent` pelo cliente. Auditada em research R-3 e no contrato de rules. A dívida (estoque/counter forjáveis por um cliente malicioso) é **explicitamente** fechada no M4b (servidor + custom claims) — documentada, pré-lançamento.

Sem violações não-justificadas → Complexity Tracking vazio (a exceção de segurança está datada e documentada).

## Project Structure

### Documentation (this feature)

```text
specs/009-checkout/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── services.md   # orderService refatorado, paymentProvider, userService (CPF opt-in)
│   ├── firestore.md  # rules: orders create dono, products decremento, counter +1
│   └── ui.md         # tela /checkout, hook useCheckout, botão do carrinho
└── checklists/requirements.md
```

### Source Code (repository root)

```text
frontend/src/
├── utils/validation.js                 # + validateCpf (DVs) + maskCpf; testes
├── services/
│   ├── orderService.js                 # REFATOR: createOrder = itens+estoque+número (sem agregados);
│   │                                   #   nova aplicação de agregados na transição `pago` (advanceStatus);
│   │                                   #   restockAndClose reverte agregados só se já pago
│   ├── paymentProvider.js              # NOVO — interface/stub (createPayment(order) → {status:"pendente"})
│   └── userService.js                  # + saveCpf(uid, cpf) (opt-in) e leitura do CPF salvo
├── hooks/useCheckout.js                # NOVO — estado do checkout (endereço/CPF/método/validação/confirmar)
├── pages/
│   ├── Checkout/index.jsx              # NOVO — tela /checkout (+ styles)
│   └── Checkout/Success/index.jsx      # NOVO — pedido criado / aguardando pagamento
├── pages/Cart/index.jsx                # habilita "Finalizar compra" → /checkout
├── constants/routes.js                 # + CHECKOUT ("/checkout")
└── routes/index.jsx                    # rota /checkout sob PrivateRoute
(raiz) firestore.rules                  # orders create dono + products decremento + counter +1
```

**Structure Decision**: single-frontend existente. Sem backend (M4b traz Functions). O pagamento é uma interface local (`paymentProvider`) para o M4b substituir. O refactor do `orderService` é a mudança mais delicada e é coberto por testes antes de tocar a UI.

## Complexity Tracking

Sem violações da constituição — a exceção de segurança (criação de pedido client-side) está documentada, escopada nas rules e datada para fechamento no M4b (research R-3). Seção não aplicável.
