# Contracts — UI (M5a / 011)

## Admin: tela de Frete (`/admin/frete`)

- `ADMIN_SHIPPING = "/admin/frete"` (routes.js) sob `AdminRoute`; item **"Frete"** no `NAV_ITEMS` do `AdminLayout`.
- `pages/Admin/Shipping/index.jsx`: 
  - **Regras**: lista editável — por regra, nome da região, **faixas de CEP** (from–to, máscara), **valor** (`parseBRLInput`), **prazo** (dias), e opcional **faixa de valor** (min/max subtotal). Adicionar/remover/reordenar.
  - **Frete padrão "demais regiões"**: valor + prazo (opcional; vazio = bloquear CEP sem regra).
  - **Frete grátis acima de**: valor (opcional).
  - Salvar valida via `validateShippingSettings` (erros campo a campo: sobreposição, faixa malformada, valor/prazo) e grava via `updateShippingSettings`. Estados carregando/salvando/erro. Reusa o padrão de formulários/tabelas do admin.

## Checkout (`/checkout`) — cálculo do frete

- `useCheckout` passa a: derivar o **CEP** do endereço selecionado (ou de um campo editável), chamar `shippingProvider.quote({ cep, subtotal })` ao montar e **ao mudar CEP/endereço/subtotal**; expor `shipping` (valor), `shippingEtaDays`, `shippingMethod`, `shippingError` (`sem_regra`/`sem_config`), e `total = subtotal + shipping`.
- **Resumo**: a linha "Frete" mostra o **valor** + **prazo** ("R$ 19,90 · até 5 dias úteis") ou **"Frete grátis"**; `total` reflete. Enquanto calcula: "Calculando frete…".
- **Bloqueio**: `canConfirm` passa a exigir um frete resolvido (ou grátis). CEP **sem regra e sem padrão** → aviso "ainda não entregamos nessa região" e confirmar bloqueado. CEP inválido (ViaCEP) → erro no campo. Config ausente → mantém "a combinar" (não confirma).
- `confirm()` passa o frete calculado ao `createOrder` (valor + etaDays + method + cep).

## Banner (TopBar)

- `components/TopBar/index.jsx` lê `freeShippingThreshold` via `useShippingSettings` e mostra "Frete grátis acima de R$X"; sem limite → oculta o banner (ou texto genérico).

## Design system

`docs/design-system.md`: seção **Frete** (tela de tabela no admin; linha de frete no checkout com valor+prazo; banner conectado ao limite).

Testes (unit/RTL onde couber): matching/compute cobertos no util; `useCheckout` recalcula ao mudar CEP e bloqueia sem regra; admin salva/valida a tabela.
