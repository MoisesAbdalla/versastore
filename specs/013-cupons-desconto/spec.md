# Feature Specification: Cupons de Desconto (013)

**Feature Branch**: `013-cupons-desconto`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: cupons de desconto — o lojista cria cupons no admin e o cliente aplica no checkout, com o desconto entrando no total do pedido. Sem gateway/servidor (client + Firestore + rules); integra com o total que o checkout (M4a/009) e o frete (M5a/011) já montam.

## Contexto

O checkout (009/M4a) já compõe `subtotal + frete = total` e congela esses campos no pedido; o frete (011/M5a) adiciona `shipping`/`shippingStatus` ao total. Esta feature insere um **desconto por cupom** nessa composição: `total = subtotal + frete − desconto`, gravado congelado no pedido. É 100% client + Firestore + regras de segurança (sem Cloud Functions, sem depender do Blaze). Reutiliza o padrão de tabelas/formulários do admin (categorias 003, variações 008, frete 011), o `useCheckout`/resumo do checkout, e o gancho de "conta no pago" do `orderService` para a contagem de uso.

## Clarifications

### Session 2026-07-17

- Q: Sobre o que o desconto do cupom incide? → A: **Só o subtotal** (itens); o frete fica de fora. A regra de frete grátis por valor (M5a) continua avaliando o subtotal **antes** do desconto.
- Q: Quando o uso do cupom é contabilizado (para o limite)? → A: **No pagamento** (transição para `pago`), reusando o gancho de agregados-no-pago do M4a. Pedido não pago não consome uso.
- Q: Quais tipos de cupom entram na 013? → A: **Valor fixo + percentual + frete grátis** (três tipos). O tipo "frete grátis" zera o frete do pedido via cupom, independente do valor.
- Q: O limite de uso é total, por cliente, ou ambos? → A: **Só limite total** por cupom (sem rastrear uso por cliente na 013).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lojista gerencia cupons no admin (Priority: P1) 🎯 MVP

O lojista abre uma tela de **Cupons** no painel, cria um cupom informando **código** (ex.: `BEMVINDO10`), **tipo** (valor fixo em R$, percentual % ou frete grátis), **valor** (quando aplicável), e opcionalmente **pedido mínimo**, **validade** (início/fim), **limite de uso total** e **ativo/inativo**. Vê a lista de cupons com o status de cada um (ativo, inativo, expirado, esgotado) e pode editar, ativar/desativar ou remover. A tela valida os campos (código único e normalizado, valor > 0, percentual ≤ 100, datas coerentes) antes de salvar.

**Why this priority**: sem cupons cadastrados e válidos, não há nada para o cliente aplicar. É o alicerce da feature e testável isoladamente no admin.

**Independent Test**: criar um cupom de 10%, um de R$20 com pedido mínimo R$100 e validade, tentar salvar um com percentual 150 / código duplicado / data fim antes da início (bloqueado), desativar um e vê-lo como inativo na lista.

**Acceptance Scenarios**:

1. **Given** o lojista no admin, **When** cria um cupom `BEMVINDO10` de 10% ativo, **Then** ele passa a existir e aparece na lista como "ativo".
2. **Given** um cupom com percentual 150 ou valor 0 ou código já existente, **When** tenta salvar, **Then** o sistema bloqueia com erro campo a campo e não grava.
3. **Given** um cupom com validade encerrada ou desativado, **When** o lojista vê a lista, **Then** ele aparece como "expirado"/"inativo".
4. **Given** um cupom existente, **When** o lojista o edita/remove/ativa/desativa, **Then** a alteração persiste e reflete na lista.

---

### User Story 2 - Cliente aplica cupom no checkout (Priority: P1)

No checkout, o cliente digita um código de cupom e clica em **Aplicar**. O sistema valida o cupom (existe, está ativo, dentro da validade, subtotal atinge o pedido mínimo, limite de uso não estourado) e, se válido, mostra uma **linha de desconto** no resumo e recalcula o **total = subtotal + frete − desconto** (nunca negativo). Se inválido, mostra uma mensagem clara ("cupom inválido", "expirado", "pedido mínimo de R$X não atingido", "cupom esgotado") e não altera o total. O cliente pode **remover** o cupom aplicado e o total volta ao valor sem desconto.

**Why this priority**: é a entrega de valor ao cliente e a razão comercial da feature; depende dos cupons da US1.

**Independent Test**: com um cupom de 10% válido, aplicar no checkout e ver a linha de desconto e o total reduzido; aplicar um código inexistente/expirado/abaixo do mínimo e ver a mensagem; remover o cupom e ver o total voltar.

**Acceptance Scenarios**:

1. **Given** um carrinho com subtotal R$200 e o cupom `BEMVINDO10` (10%), **When** o cliente aplica, **Then** o resumo mostra "Desconto −R$20,00" e total = subtotal + frete − 20.
2. **Given** um cupom com pedido mínimo R$100 e subtotal R$80, **When** o cliente aplica, **Then** o sistema recusa com "pedido mínimo de R$100,00 não atingido".
3. **Given** um código inexistente, inativo ou fora da validade, **When** o cliente aplica, **Then** o sistema mostra "cupom inválido/expirado" e não aplica desconto.
4. **Given** um cupom aplicado, **When** o cliente clica em remover, **Then** a linha de desconto some e o total volta ao valor sem desconto.
5. **Given** um desconto que excederia o total, **When** aplicado, **Then** o desconto é limitado de modo que o total nunca fique negativo (mínimo R$0).
6. **Given** um cupom do tipo **frete grátis** e um pedido com frete calculado R$19,90, **When** o cliente aplica, **Then** o resumo mostra "Frete grátis (cupom)" e o total = subtotal (o frete é zerado por cupom).

---

### User Story 3 - Desconto congelado no pedido e visível no histórico (Priority: P2)

Ao finalizar a compra com um cupom aplicado, o pedido grava, **congelado**, o **código do cupom** e o **valor do desconto** aplicado; o `total` do pedido já reflete o desconto. O cliente vê o desconto na composição do total em "Meus pedidos", e o lojista vê o mesmo no detalhe do pedido no admin. Alterar ou remover o cupom depois **não** muda pedidos já criados.

**Why this priority**: garante integridade histórica e transparência; depende da US2, mas é um incremento separado (persistência + exibição).

**Independent Test**: finalizar um pedido com cupom, conferir em "Meus pedidos" e no admin a linha de desconto e o total; depois excluir o cupom no admin e confirmar que o pedido antigo mantém o desconto congelado.

**Acceptance Scenarios**:

1. **Given** um checkout com cupom de R$20 aplicado, **When** o pedido é criado, **Then** o pedido grava `couponCode` e `discount` = 20 e `total = subtotal + frete − 20`.
2. **Given** um pedido criado com cupom, **When** o cliente o abre em "Meus pedidos", **Then** vê a linha "Desconto (BEMVINDO10) −R$20,00" na composição do total.
3. **Given** o cupom é removido/alterado no admin depois, **When** o pedido antigo é reaberto, **Then** ele mantém o desconto congelado (não recalcula).

---

### User Story 4 - Contagem de uso do cupom (Priority: P3)

O uso de um cupom é contabilizado quando o pedido **conta como venda** — ou seja, na transição para `pago` (mesmo gancho dos agregados do M4a), não na simples criação do pedido pendente. Assim, um pedido que nunca é pago não consome o cupom nem estoura o limite. Quando o limite total é atingido, o cupom passa a ser recusado no checkout.

**Why this priority**: refina a robustez do limite de uso; o MVP funciona sem contagem perfeita. Depende do fluxo de "marcar como pago" do admin (M4a) e será endurecido no servidor junto do M4b.

**Independent Test**: definir um cupom com limite total 1, criar e **pagar** um pedido com ele (uso vai a 1), depois tentar aplicá-lo em outro checkout e ver "cupom esgotado".

**Acceptance Scenarios**:

1. **Given** um cupom com limite total 1 e um pedido criado com ele, **When** o pedido é marcado como `pago`, **Then** a contagem de uso do cupom passa a 1.
2. **Given** esse cupom já no limite, **When** outro cliente tenta aplicá-lo, **Then** o checkout recusa com "cupom esgotado".
3. **Given** um pedido com cupom que é cancelado/nunca pago, **When** o status não chega a `pago`, **Then** a contagem de uso **não** é incrementada por esse pedido.

---

### Edge Cases

- **Total negativo**: desconto maior que `subtotal` → desconto limitado para que o total nunca fique abaixo de R$0 (o desconto efetivo gravado é o realmente aplicado).
- **Cupom fica inválido entre aplicar e finalizar** (expira, é desativado ou esgota no intervalo): revalidar no momento de criar o pedido; se inválido, avisar e recalcular sem o cupom (não gravar desconto indevido).
- **Percentual sobre subtotal com frete grátis por valor (M5a)**: o desconto de percentual incide sobre o **subtotal**; a regra de frete grátis por valor (M5a) usa o **subtotal antes** do desconto (o cupom não deve derrubar o subtotal abaixo do limite de frete grátis para efeito da regra de frete).
- **Cupom de frete grátis com frete "a combinar" (M5a sem tabela)**: se o frete ainda não foi calculado (`sem_config`/"a combinar"), o cupom de frete grátis marca o pedido como **frete R$0** e o desconto efetivo por frete é 0 (não há valor a abater); o pedido segue com frete grátis.
- **Cupom de frete grátis com frete já grátis por valor (M5a)**: se o frete já é R$0 pela regra de valor, o cupom de frete grátis não muda o total (desconto de frete = 0), mas continua válido.
- **Código com espaços/maiúsculas-minúsculas**: normalizar (trim + maiúsculas) na criação e na aplicação, para `bemvindo10` == `BEMVINDO10`.
- **Dois cupons**: só um cupom por pedido; aplicar um novo substitui o anterior (sem empilhamento).
- **Limite de uso forjável sem servidor**: as regras do Firestore não validam consistência entre documentos, então o limite de uso é, no fluxo client-only, **contornável** por um cliente malicioso. Tratado como **dívida pré-lançamento**, a ser endurecida no servidor junto do M4b (webhook confiável). Documentado, não bloqueia a M5a-style entrega.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O admin MUST permitir criar/editar/remover/ativar/desativar cupons, cada um com: **código** (único, normalizado maiúsculas), **tipo** (valor fixo R$ | percentual % | frete grátis), **valor** (obrigatório para fixo/percentual; ignorado para frete grátis), **pedido mínimo** (opcional), **validade início/fim** (opcional), **limite de uso total** (opcional) e **ativo/inativo**.
- **FR-002**: O admin MUST validar campo a campo antes de gravar: código não vazio e único; valor > 0; percentual ≤ 100; data fim ≥ data início quando ambas presentes; limites ≥ 0.
- **FR-003**: O admin MUST listar os cupons com um **status derivado**: ativo, inativo, expirado (fora da validade) ou esgotado (uso ≥ limite).
- **FR-004**: O checkout MUST permitir ao cliente **aplicar** um cupom por código e **remover** o cupom aplicado.
- **FR-005**: Ao aplicar, o sistema MUST validar o cupom: existe, está ativo, dentro da validade, subtotal ≥ pedido mínimo, e uso abaixo do limite; se qualquer condição falhar, MUST recusar com mensagem específica e não aplicar desconto.
- **FR-006**: O desconto de cupom **fixo/percentual** MUST incidir sobre o **subtotal** (itens): percentual = `subtotal × %`, fixo = valor em R$. O frete (M5a) não é base do desconto e sua regra de frete grátis por valor continua avaliando o subtotal **antes** do desconto.
- **FR-006a**: O cupom do tipo **frete grátis** MUST zerar o **frete** do pedido (o cliente não paga frete), independente do valor do subtotal; o abatimento efetivo é o valor do frete calculado (0 se não houver frete a cobrar). Não altera o subtotal.
- **FR-007**: O total MUST ser `subtotal + frete − desconto`, **nunca negativo** (desconto limitado ao necessário para não passar de R$0).
- **FR-008**: O pedido MUST gravar, **congelado**, `couponCode` e `discount` (valor aplicado); o `total` do pedido já reflete o desconto. Alterações posteriores no cupom não afetam pedidos existentes.
- **FR-009**: "Meus pedidos" (cliente) e o detalhe do pedido no admin MUST exibir a linha de desconto (código + valor) na composição do total.
- **FR-010**: O sistema MUST revalidar o cupom no momento de **criar o pedido**; se ficou inválido desde a aplicação, MUST recalcular sem o cupom e avisar (não gravar desconto indevido).
- **FR-011**: A contagem de uso do cupom MUST ser incrementada quando o pedido **conta como venda** (transição para `pago`), reusando o gancho de agregados-no-pago do M4a; pedidos não pagos não consomem uso. O limite é **total por cupom** (sem limite por cliente na 013).
- **FR-012**: Apenas **um cupom por pedido** (sem empilhamento); aplicar outro substitui o anterior.
- **FR-013**: O código do cupom MUST ser normalizado (trim + maiúsculas) na criação e na aplicação, de modo que a busca seja case-insensitive.
- **FR-014**: A leitura de um cupom pelo cliente no checkout MUST ser possível **por código** (validação), sem expor a **lista completa** de cupons (o cliente não pode enumerar todos os cupons).
- **FR-015**: A escrita de cupons (criar/editar/remover) MUST ser restrita ao **admin**.
- **FR-016**: O sistema MUST tratar três tipos de cupom: **valor fixo**, **percentual** e **frete grátis** (ver FR-006/FR-006a). O tipo frete grátis coexiste com a regra de frete grátis por valor do M5a (que independe de cupom).

### Key Entities *(include if feature involves data)*

- **Cupom**: representa um código de desconto. Atributos: `code` (id, único, maiúsculas), `type` (`fixo` | `percentual` | `frete_gratis`), `value` (R$ em centavos ou % conforme tipo; irrelevante para `frete_gratis`), `minSubtotal?` (pedido mínimo), `startAt?`/`endAt?` (validade), `maxUses?` (limite total), `usedCount` (uso acumulado, incrementado no pago), `active` (bool). Status (ativo/inativo/expirado/esgotado) é **derivado** desses campos.
- **Pedido** (existente, M4a): ganha `couponCode` (string|null) e `discount` (valor de desconto aplicado ao subtotal, congelado); para cupom de frete grátis, o `shipping` do pedido é 0 e um marcador (ex.: `shippingStatus: "gratis"` + `couponCode`) indica frete grátis por cupom. `total` passa a refletir `subtotal + frete − discount`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O lojista cria, edita, ativa/desativa e remove cupons no admin, com validação que impede cupons inválidos (percentual > 100, código duplicado, datas incoerentes).
- **SC-002**: O cliente aplica um cupom válido no checkout e vê o desconto refletido no resumo e no total em tempo real; um cupom inválido é recusado com mensagem clara.
- **SC-002a**: Um cupom de **frete grátis** aplicado no checkout zera o frete do pedido (total = subtotal), e isso fica visível no resumo.
- **SC-003**: O total nunca fica negativo, independentemente do valor do cupom.
- **SC-004**: O pedido finalizado com cupom grava o código e o valor do desconto congelados; "Meus pedidos" e o admin exibem o desconto; alterar o cupom depois não muda pedidos antigos.
- **SC-005**: Um cupom com limite de uso esgotado é recusado no checkout; pedidos não pagos não consomem uso.
- **SC-006**: Um cliente não consegue listar todos os cupons cadastrados (apenas validar por código conhecido).

## Assumptions

- **Base do desconto = subtotal** (itens) para cupons fixo/percentual; frete não é base (clarify 2026-07-17). O frete grátis por valor (M5a) continua avaliado sobre o subtotal antes do desconto.
- **Contagem de uso no `pago`** (não na criação), reusando o gancho de agregados-no-pago do M4a — alinhado à decisão da opção C do checkout (clarify 2026-07-17).
- **Tipos suportados**: valor fixo + percentual + **frete grátis** (clarify 2026-07-17). O tipo frete grátis zera o frete do pedido por cupom e coexiste com a regra de frete grátis por valor do M5a.
- **Limite de uso total por cupom** apenas — sem limite por cliente na 013 (clarify 2026-07-17).
- **Um cupom por pedido** (sem empilhamento).
- **Limite de uso é forjável no fluxo client-only** (as regras do Firestore não validam consistência entre documentos) — dívida pré-lançamento, endurecida no servidor junto do M4b. Não bloqueia esta entrega.
- Reutiliza: o resumo/total do `useCheckout` (M4a/M5a), o padrão de tela/formulário do admin (003/008/011), o design system, os campos congelados do pedido (M4a) e o gancho de status→`pago` do `orderService`.
- Um novo local de dados para cupons (coleção dedicada, código como identificador) com **leitura por código para autenticados** e **escrita só admin**; requer ajuste/deploy das regras de segurança (passo manual do lojista, como nas features anteriores).
- Textos em pt-BR; estados carregando/erro/vazio; validação campo a campo.

### Out of Scope

- Cupons automáticos por regra sem código (ex.: "10% na primeira compra") — apenas cupons por código digitado.
- Promoções por produto/categoria (o produto já tem preço promocional) — o cupom é sobre o pedido.
- Qualquer processamento de pagamento (M4b) — o cupom só ajusta o total do pedido.
- Endurecimento server-side do limite de uso (fica com o M4b/Blaze).
