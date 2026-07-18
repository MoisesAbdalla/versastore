# Contracts — UI (013)

## Admin — Tela de Cupons (`/admin/cupons`, `AdminRoute`)

Reusa o padrão de lista + formulário (categorias 003 / variações 008 / frete 011), tokens e estados carregando/erro/vazio (Princípio III).

**Lista**:
- Colunas: **Código**, **Tipo** (Valor fixo / Percentual / Frete grátis), **Valor** (R$ ou %), **Status** (badge: ativo / inativo / expirado / esgotado, via `couponStatus`), **Usos** (`usedCount`/`maxUses` ou "∞"), ações (editar, ativar-desativar, remover).
- Estado vazio: "Nenhum cupom cadastrado".

**Formulário** (criar/editar):
- **Código** (texto; maiúsculas; **desabilitado na edição** — id imutável).
- **Tipo** (select: fixo / percentual / frete grátis). Para **frete grátis**, o campo Valor **some/desabilita**.
- **Valor** (R$ via máscara BRL para fixo; número 1–100 para percentual).
- **Pedido mínimo** (R$, opcional).
- **Validade** início/fim (date, opcionais).
- **Limite de uso total** (número, opcional).
- **Ativo** (switch).
- Salvar → `validateCouponInput` (erros campo a campo) → `createCoupon`/`updateCoupon`; toast de sucesso/erro (`useFeedback`). Código duplicado → erro no campo Código.

**Nav**: item **"Cupons"** no `NAV_ITEMS` do `AdminLayout` (ícone de cupom/oferta), perto de Frete. Rota lazy em `routes/index.jsx`.

## Checkout — Campo de cupom (`pages/Checkout/index.jsx`)

No resumo do pedido, abaixo do frete e acima do total:
- **Campo "Cupom de desconto"** + botão **Aplicar** (quando nenhum aplicado).
- Ao aplicar: `useCheckout.applyCoupon(code)` → se válido, mostra a **linha de desconto** e recompõe o total; se inválido, mensagem específica abaixo do campo:
  - inativo/expirado → "Cupom inválido ou expirado";
  - esgotado → "Cupom esgotado";
  - minimo → "Pedido mínimo de R$X não atingido";
  - não encontrado → "Cupom não encontrado".
- **Cupom aplicado**: mostra "Cupom **CÓDIGO** aplicado" + botão **Remover** (`removeCoupon`).
- **Resumo** (linhas):
  - Subtotal — R$X
  - Frete — R$Y **ou** "Frete grátis (cupom)" quando o cupom é frete grátis
  - **Desconto (CÓDIGO)** — −R$Z (só quando `discount > 0`)
  - **Total** — R$(subtotal − desconto + frete efetivo)
- Se, ao confirmar, o `createOrder` lançar `cupom-invalido`: remover o cupom, exibir aviso ("O cupom deixou de ser válido; revise o pedido.") e permitir refazer.
- `canConfirm` não depende do cupom (cupom é opcional); um cupom inválido apenas não aplica desconto.

## Histórico do pedido — desconto na composição

- **Cliente** (`Account/Orders/Detail`): na composição do total, mostrar **Desconto (CÓDIGO) −R$Z** quando `discount > 0`; frete "Grátis" quando `shippingStatus === "gratis"` (e, se `couponType === "frete_gratis"`, rótulo "Grátis (cupom)").
- **Admin** (painel de detalhe do pedido): mesma linha de desconto na composição do total, para o lojista conferir.

## Design system

`docs/design-system.md` ganha a seção **Cupons**: tela do admin (lista + form), campo de cupom no checkout (aplicar/remover, mensagens), linha de desconto no resumo e no histórico.
