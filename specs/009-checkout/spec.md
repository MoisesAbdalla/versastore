# Feature Specification: Checkout (M4a)

**Feature Branch**: `009-checkout`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: tela de checkout que transforma o carrinho num pedido `aguardando_pagamento`, SEM processar pagamento (sem gateway, não depende de Cloud Functions). Primeira de duas features do M4; a integração do Mercado Pago é a M4b.

## Contexto e limites

Hoje o cliente monta o carrinho (M2), mas não há como fechar a compra: o botão "Finalizar" está desabilitado. Esta feature entrega o **checkout completo até a criação do pedido** — revisão do carrinho, endereço, CPF, escolha do método de pagamento e criação do pedido `aguardando_pagamento` — **sem processar cobrança**. O processamento real (Mercado Pago, webhook, avanço para `pago`, expiração/devolução de estoque) é a **M4b**, que depende de infraestrutura de servidor ainda não disponível.

O ponto de integração do pagamento é deixado como uma **interface abstrata** (um provedor de pagamento) que na M4a apenas registra "pendente", para a M4b plugar o gateway sem reescrever o checkout.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cliente finaliza a compra e gera o pedido (Priority: P1)

O cliente logado, com itens no carrinho, abre o checkout, confere os itens, escolhe um endereço de entrega, informa o CPF, escolhe um método de pagamento e confirma. O sistema cria o pedido com status "aguardando pagamento", baixa o estoque e mostra a confirmação com o número do pedido.

**Why this priority**: é o coração do M4 — sem ela não há venda. Entrega valor sozinha (o lojista passa a receber pedidos reais, ainda que o pagamento seja tratado à parte no M4b).

**Independent Test**: com itens no carrinho, um endereço salvo e um CPF válido, percorrer o checkout e confirmar; verificar que o pedido nasce `aguardando_pagamento`, o estoque baixou, o carrinho esvaziou e o pedido aparece em "Meus pedidos".

**Acceptance Scenarios**:

1. **Given** carrinho com itens, endereço salvo e CPF válido, **When** o cliente confirma o pedido, **Then** o pedido é criado com status "aguardando pagamento", o estoque das variações/produtos é baixado e o cliente vê a tela de confirmação com o número do pedido.
2. **Given** o pedido recém-criado, **When** o cliente abre "Meus pedidos" (M3), **Then** o pedido aparece com status "aguardando pagamento" e o detalhe mostra itens (preço do momento), endereço, CPF e método escolhido.
3. **Given** um checkout confirmado, **When** o pedido é criado com sucesso, **Then** o carrinho é esvaziado (não dá para recriar o mesmo pedido ao voltar).

---

### User Story 2 - Revisão do carrinho revalidado antes de pagar (Priority: P1)

Ao abrir o checkout, o cliente vê os itens já **revalidados** contra o catálogo atual (preço/estoque). Se algo mudou (item esgotado/removido, preço alterado, quantidade ajustada), o sistema **avisa** e exige a ciência do cliente antes de prosseguir — nunca cria um pedido com dado velho.

**Why this priority**: evita vender com preço/estoque desatualizado; é pré-condição de um pedido correto e reusa a revalidação que já existe no carrinho (M2).

**Independent Test**: adulterar o estoque/preço de um item entre montar o carrinho e abrir o checkout; verificar que o checkout mostra o aviso do que mudou e só deixa confirmar após o cliente revisar.

**Acceptance Scenarios**:

1. **Given** um item que ficou esgotado desde que entrou no carrinho, **When** o cliente abre o checkout, **Then** o item aparece sinalizado/removido com aviso e o cliente não consegue confirmar até revisar.
2. **Given** um item cujo preço mudou, **When** o cliente abre o checkout, **Then** o subtotal reflete o preço atual e há aviso da mudança.
3. **Given** um carrinho vazio (ou que ficou vazio após a revalidação), **When** o cliente acessa o checkout, **Then** vê um estado vazio orientando a voltar ao catálogo (sem opção de confirmar).

---

### User Story 3 - Endereço e CPF válidos antes de confirmar (Priority: P1)

O cliente escolhe um dos endereços salvos (M3) como entrega e informa um CPF válido. Sem endereço selecionado ou com CPF inválido, o botão de confirmar não prossegue e o campo aponta o erro.

**Why this priority**: um pedido sem endereço não é entregável e sem CPF válido não é faturável (M8). É requisito de correção do pedido.

**Independent Test**: tentar confirmar sem endereço → bloqueado com orientação; digitar CPF inválido → erro no campo; selecionar endereço e CPF válido → habilita confirmar.

**Acceptance Scenarios**:

1. **Given** o cliente sem nenhum endereço salvo, **When** abre o checkout, **Then** vê orientação para cadastrar endereço (link para a área de endereços) e não consegue confirmar.
2. **Given** vários endereços salvos, **When** o cliente abre o checkout, **Then** o endereço padrão vem pré-selecionado e ele pode trocar por outro.
3. **Given** um CPF com dígitos verificadores inválidos, **When** o cliente tenta confirmar, **Then** o campo mostra "CPF inválido" e a confirmação é bloqueada.

---

### Edge Cases

- **Estoque insuficiente no momento da confirmação**: se entre abrir o checkout e confirmar o estoque acabar, a criação do pedido (transação) falha com mensagem clara e nada é cobrado/baixado — o cliente revê o carrinho.
- **Sessão/anônimo**: checkout é rota protegida; visitante anônimo é levado ao login e volta ao checkout após entrar.
- **Cadastro incompleto** (sem telefone/aceite — feature 007): se aplicável, o cliente é levado a completar o cadastro antes de finalizar.
- **Método de pagamento**: na M4a, escolher Pix/cartão/boleto apenas registra a preferência no pedido; nenhuma cobrança, QR code, redirecionamento ou dado de cartão é coletado.
- **Duplo clique / reenvio**: confirmar não pode criar dois pedidos; o botão bloqueia durante a criação.
- **Falha na criação**: erro de rede/transação mostra mensagem e permite tentar de novo, sem esvaziar o carrinho nem baixar estoque.

## Requirements *(mandatory)*

### Functional Requirements

**Fluxo de checkout**

- **FR-001**: O checkout MUST ser acessível apenas ao cliente autenticado (rota protegida); visitante é direcionado ao login e retorna ao checkout após entrar.
- **FR-002**: O checkout MUST exibir os itens do carrinho já **revalidados** contra o catálogo atual (preço/estoque), com aviso explícito quando a revalidação alterou/removeu itens, e MUST impedir confirmar enquanto o cliente não revisar as mudanças.
- **FR-003**: O checkout MUST permitir selecionar o endereço de entrega entre os endereços salvos do cliente, com o padrão pré-selecionado; sem endereço, MUST orientar o cadastro e bloquear a confirmação.
- **FR-004**: O checkout MUST coletar e validar o CPF pelos dígitos verificadores (com máscara), bloqueando a confirmação com CPF inválido. [NEEDS CLARIFICATION: o CPF é salvo no perfil do cliente para reuso futuro, ou fica só no pedido?]
- **FR-005**: O checkout MUST permitir escolher **um** método de pagamento entre Pix, cartão e boleto — apenas a **seleção** (registrada no pedido); nenhuma cobrança/processamento ocorre nesta feature.
- **FR-006**: O checkout MUST exibir um resumo com o **subtotal** dos itens. [NEEDS CLARIFICATION: frete no M4a — exibir "frete a combinar"/"grátis" ou omitir? O cálculo de frete real está fora do escopo.]
- **FR-007**: O botão de confirmar MUST só prosseguir com carrinho válido e não vazio, endereço selecionado, CPF válido e método escolhido; e MUST bloquear reenvio durante a criação (sem pedido duplicado).

**Criação do pedido**

- **FR-008**: Ao confirmar, o sistema MUST criar o pedido com status **"aguardando pagamento"** de forma transacional, reusando a lógica de estoque existente: congelar os itens (preço/rótulo de variação do momento), **baixar o estoque**, gerar o número sequencial e gravar endereço de entrega, método de pagamento, CPF e os agregados do cliente/estatísticas do dia.
- **FR-009**: Se o estoque for insuficiente na confirmação, a criação MUST falhar atomicamente (nada baixado, nenhum pedido criado) com mensagem clara para o cliente revisar o carrinho.
- **FR-010**: Após a criação bem-sucedida, o carrinho do cliente MUST ser esvaziado e o cliente MUST ver uma tela de confirmação com o número do pedido e a informação de que está "aguardando pagamento".
- **FR-011**: O pedido criado MUST aparecer em "Meus pedidos" (M3) com status "aguardando pagamento", e o detalhe MUST mostrar itens, endereço, método e CPF.

**Segurança**

- **FR-012**: As regras de acesso MUST permitir que o cliente **dono** crie o próprio pedido (vinculado ao seu identificador), restrito ao status inicial "aguardando pagamento"; o cliente MUST NOT poder criar pedido para outro, forjar total/itens fora do previsto, nem avançar/alterar o status (mudança de status continua exclusiva do admin — M3).

**Ponto de integração de pagamento (preparação para M4b)**

- **FR-013**: O processamento de pagamento MUST ser encapsulado em uma **interface de provedor de pagamento** bem definida; na M4a essa interface apenas registra o pedido como "pendente" (sem cobrança). A tela de checkout e a criação do pedido MUST NOT depender de nenhum gateway específico, para que a M4b conecte o Mercado Pago sem reescrever o checkout.

### Key Entities *(include if feature involves data)*

- **Pedido**: já existe (M3). A M4a passa a criá-lo pelo **cliente** (antes só admin/seed). Nasce `aguardando_pagamento` com: itens congelados (preço + rótulo de variação do momento), número sequencial, endereço de entrega (cópia do endereço escolhido), método de pagamento, **CPF do comprador**, cliente (uid + nome/e-mail), subtotal/total, histórico de status.
- **Endereço de entrega**: cópia do endereço salvo do cliente (M3) no momento da compra — o pedido guarda o endereço "congelado", não uma referência mutável.
- **Item do carrinho**: origem dos itens do pedido; revalidado contra o catálogo antes da criação (M2).
- **Provedor de pagamento (interface)**: abstração do processamento; na M4a um stub que marca "pendente". Contrato estável para a M4b.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um cliente com itens no carrinho, endereço salvo e CPF válido consegue concluir o checkout e gerar um pedido em poucos passos, numa única tela de checkout.
- **SC-002**: 100% dos pedidos criados no checkout nascem com status "aguardando pagamento", com estoque baixado e itens/preços congelados corretamente (nenhum pedido pago é gerado na M4a).
- **SC-003**: É impossível confirmar um pedido sem endereço selecionado, com CPF inválido, sem método escolhido, ou com carrinho vazio/desatualizado não revisado.
- **SC-004**: Nenhum pedido é criado com estoque insuficiente: a confirmação nesse caso falha sem baixar estoque nem cobrar.
- **SC-005**: Todo pedido criado aparece imediatamente em "Meus pedidos" do cliente com o status e os dados corretos (itens, endereço, método, CPF).
- **SC-006**: Um cliente não consegue criar pedido em nome de outro nem definir o status como pago — apenas o próprio pedido, "aguardando pagamento".
- **SC-007**: Confirmar duas vezes (duplo clique) não gera dois pedidos.
- **SC-008**: Nenhuma cobrança, chamada a gateway, QR code, dado de cartão ou avanço para "pago" ocorre na M4a — o pagamento fica encapsulado numa interface substituível pela M4b.

## Out of Scope — pendente para o M4b (documentado, NÃO implementado aqui)

- Geração de cobrança real no Mercado Pago a partir do pedido "aguardando pagamento".
- Webhook do gateway com validação de assinatura, idempotência e reconciliação via API.
- Avanço automático do pedido para **"pago"** — que na M4b ocorre SOMENTE via webhook (nunca pelo cliente).
- Expiração de pagamentos pendentes: rotina agendada que cancela o pedido não pago e **devolve o estoque** (reusando o cancelamento existente).
- Cálculo de frete real e cobrança do frete.
- Migração do papel de admin para custom claims.
- Coleta/processamento de dados de cartão, QR code de Pix, boleto — tudo isso é responsabilidade do gateway no M4b.

## Assumptions

- O carrinho persistente (M2) e sua revalidação já existem e são reutilizados; o subtotal vem do carrinho.
- Os endereços do cliente (M3) já existem em `users.addresses`; o checkout apenas seleciona e copia para o pedido.
- A criação transacional de pedido com baixa de estoque e congelamento de itens já existe (M1/003) e é reutilizada — a M4a não reescreve essa lógica, apenas a expõe ao cliente.
- O CPF é validado por dígitos verificadores no cliente; a autoridade fiscal do CPF é do M8.
- Após criar o pedido, o carrinho é esvaziado (evita pedido duplicado ao voltar).
- Frete real e impostos estão fora do escopo do M4a (subtotal = soma dos itens).
- A feature não introduz backend/servidor: tudo roda no cliente + Firestore com regras; o pagamento é um stub até o M4b.
