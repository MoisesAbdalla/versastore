# Contracts — UI (M4a / 009)

## Rota e guarda

- `CHECKOUT = "/checkout"` (constants/routes.js) sob **`PrivateRoute`** (anônimo → login → volta). Perfil incompleto (007) → completar cadastro antes (reusa o guard).
- `Cart`: o botão **"Finalizar compra"** (hoje `disabled`) passa a navegar para `/checkout` quando o carrinho não está vazio.

## `hooks/useCheckout.js` (NOVO)

Orquestra o estado do checkout:
- **carrinho**: dispara `CartContext.revalidate()` ao montar; expõe `items`, `subtotal`, `changes` (mudanças da revalidação) e `mustReview` (bloqueia confirmar até ciência);
- **endereço**: lista `profile.addresses`; `selectedAddressId` (padrão pré-selecionado); `hasAddress`;
- **CPF**: `cpf` (pré-preenchido de `profile.cpf`), `cpfError` (via `validateCpf`), `saveCpf` (opt-in checkbox);
- **método**: `paymentMethod` ∈ {pix, cartao, boleto};
- **confirmar**: `canConfirm` (carrinho válido/não vazio/revisado + endereço + CPF válido + método) e `confirm()` que chama `orderService.createOrder(...)` (+ `userService.saveCpf` se opt-in) via `paymentProvider` (stub), esvazia o carrinho (`clear()`) e navega para o sucesso; bloqueia reenvio (`submitting`).

## `pages/Checkout/index.jsx` (NOVO)

Tela única sob `MainLayout` com seções: **Itens** (revalidados, com aviso de mudanças), **Endereço** (seleção entre salvos; se nenhum, CTA para `/conta/enderecos` e bloqueia), **CPF** (`FormField` + máscara + checkbox opt-in), **Pagamento** (Pix/cartão/boleto — só seleção), **Resumo** (`subtotal` + "Frete: a combinar" + `total`). Botão **"Confirmar pedido"** desabilitado até `canConfirm`; estados carregando/erro. Erro de criação (ex.: estoque) mostra mensagem e mantém carrinho.

## `pages/Checkout/Success/index.jsx` (NOVO)

"Pedido criado — aguardando pagamento" com o **número do pedido**, aviso de que o pagamento será tratado em breve (M4b), e CTAs "Ver meus pedidos" (`/conta/pedidos`) e "Continuar comprando" (`/products`).

## Design system

`docs/design-system.md`: seção do **Checkout** (fluxo numa página, resumo com frete "a combinar", seleção de endereço/CPF/método, tela de sucesso).

Testes (RTL/unit onde couber): `canConfirm` só com endereço+CPF válido+método+carrinho revisado; sem endereço → CTA e bloqueio; CPF inválido → erro; confirmar chama `createOrder` com os dados certos e esvazia o carrinho; duplo submit bloqueado.
