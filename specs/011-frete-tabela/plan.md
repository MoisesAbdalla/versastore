# Implementation Plan: Frete por Tabela (M5a)

**Branch**: `011-frete-tabela` | **Date**: 2026-07-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-frete-tabela/spec.md`

## Summary

Entregar o cálculo de frete por **tabela configurável no admin**, sem API externa nem servidor. O lojista configura, numa nova tela do painel, **regras por região (faixas de CEP)** com valor e prazo, um **frete padrão "demais regiões"** (catch-all) e o **limite de frete grátis**. No checkout (M4a), o cliente informa/confirma o **CEP** (validado por ViaCEP, M3), o frete é **calculado pela tabela** e **preenche** `shipping` (o campo que a M4a já deixou pronto), com `total = subtotal + shipping` e o prazo exibido. O banner "Frete grátis acima de R$X" (hoje fixo no TopBar) passa a refletir o limite configurado.

Decisões do `/clarify`: **sem peso** na M5a (só região + faixa de valor; peso é M5b); **CEP sem regra** usa o frete padrão ou, se não definido, **bloqueia** com aviso; **retirada na loja fora de escopo**. O cálculo fica atrás de uma **interface `shippingProvider`** (implementação por tabela), para o M5b plugar a API real sem reescrever o checkout — mesmo padrão do `paymentProvider` da M4a.

## Technical Context

**Language/Version**: JavaScript (ES Modules), React 19.2 + Vite 8 — sem TypeScript.

**Primary Dependencies**: Firebase SDK 12 (Firestore), React Router 7, MUI 9 (admin), CSS Modules + tokens de `variables.css`, ViaCEP (fetch, já usado no M3).

**Storage**: Firestore — **novo doc `settings/shipping`** (regras + padrão + limite). Sem novas coleções. Pedido: preenche `shipping` e novos campos congelados.

**Testing**: Vitest 4 + RTL + jsdom; Firestore/ViaCEP mockados (padrão do projeto).

**Target Platform**: Web (loja + admin), responsivo.

**Project Type**: Web app single-frontend, **sem backend** (a API real é M5b).

**Performance Goals**: cálculo de frete é local (tabela) + 1 chamada ViaCEP para validar/exibir a cidade; checkout interativo < 3s (Princípio IV).

**Constraints**: mudança **aditiva** (pedido/settings); nenhuma mudança de rules (`settings` já é leitura pública + escrita admin); não quebrar checkout (009), carrinho (M2), conta (007), variações (008), vitrine, admin.

**Scale/Scope**: poucas regiões (≤ ~6) + padrão; catálogo pequeno-médio; pré-lançamento.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality** — PASS. Cálculo isolado em `shippingProvider` (interface) + util puro de matching CEP→região/regra; validação da tabela num util reutilizado por form e provider; sem duplicar lógica no checkout. `oxlint` zero erros.
- **II. Testing Standards** — PASS. Toca o total do pedido → testar: matching CEP/faixa de valor, frete grátis por limite, CEP sem regra (padrão vs bloqueio), congelamento no pedido, e a integração com o `useCheckout` (recalcula ao mudar CEP; total = subtotal + frete). Não toca estoque/pagamento.
- **III. UX Consistency** — PASS. Tela de frete no admin reusa o padrão de formulários/tabelas (003/008); checkout reusa `FormField`/estados; banner e resumo nos tokens; `docs/design-system.md` ganha a seção de frete.
- **IV. Performance** — PASS. Config de frete lida uma vez (cache de módulo, como `settingsService`); ViaCEP com timeout (reuso do cepService); sem leitura ilimitada; admin segue code-split.

Sem violações → Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/011-frete-tabela/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── services.md   # settingsService (shipping), shippingProvider, util de matching/validação, orderService
│   └── ui.md         # tela admin de frete, checkout (CEP+frete), banner
└── checklists/requirements.md
```

### Source Code (repository root)

```text
frontend/src/
├── services/
│   ├── settingsService.js              # + getShippingSettings/updateShippingSettings (doc settings/shipping)
│   ├── shippingProvider.js             # NOVO — quote({cep, subtotal}) por TABELA (interface p/ o M5b)
│   └── orderService.js                 # createOrder aceita/grava shipping + shippingEtaDays/shippingCep/shippingMethod; shippingStatus definido
├── utils/
│   ├── shipping.js                     # NOVO — matching CEP→regra, aplica faixa de valor + frete grátis + padrão; validação da tabela
│   └── __tests__/shipping.test.js
├── constants/routes.js                 # + ADMIN_SHIPPING ("/admin/frete")
├── hooks/
│   ├── useShippingSettings.js          # NOVO — lê a config (cache) p/ banner e checkout
│   └── useCheckout.js                  # calcula o frete via shippingProvider; recalcula ao mudar CEP; total = subtotal + frete; bloqueia sem regra
├── pages/
│   ├── Admin/Shipping/index.jsx        # NOVA tela — regras (região/CEP/valor/prazo) + padrão + limite grátis (+ styles)
│   └── Checkout/index.jsx              # campo/confirmação de CEP + linha de frete (valor + prazo) no resumo
├── components/TopBar/index.jsx         # banner de frete grátis lê o limite configurado
├── layouts/AdminLayout/index.jsx       # + item de nav "Frete"
└── routes/index.jsx                    # rota /admin/frete (AdminRoute)
```

**Structure Decision**: single-frontend existente. Config em `settings/shipping` (leitura pública p/ checkout+banner, escrita admin — rules atuais já cobrem, sem mudança). O cálculo é uma interface local (`shippingProvider`) para o M5b substituir pela API. Nenhuma mudança em `firestore.rules` nem novos índices.

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
