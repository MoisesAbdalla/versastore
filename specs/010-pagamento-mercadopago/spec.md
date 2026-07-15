# Feature Specification: Integração de Pagamento — Mercado Pago (M4b)

**Feature Branch**: `010-pagamento-mercadopago` (a criar quando iniciar)

**Created**: 2026-07-15

**Status**: Draft — **BLOQUEADA até o plano Blaze do Firebase estar ativo** (Cloud Functions exigem Blaze)

**Input**: User description: segunda feature do M4 — plugar o Mercado Pago no ponto de integração deixado pela M4a (checkout), com processamento real de pagamento via Cloud Functions.

## Contexto e pré-requisito

A M4a (checkout, feature 009) cria o pedido `aguardando_pagamento` e deixa o pagamento encapsulado numa **interface de provedor de pagamento** (stub). A M4b conecta o **Mercado Pago** nessa interface e trata todo o ciclo de pagamento no servidor. **Pré-requisito duro:** plano **Blaze** do Firebase ativo (Cloud Functions + tarefas agendadas). Enquanto o Blaze não estiver ativo, esta feature não é iniciada.

Quando iniciar, esta spec deve passar por `/speckit-clarify` (ex.: sandbox vs produção, janela de expiração do pagamento, política de pagamento-após-expiração) antes do plano.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cliente paga o pedido pendente (Priority: P1)

O cliente com um pedido `aguardando_pagamento` (criado no checkout M4a) é levado ao pagamento do Mercado Pago para o método escolhido (Pix/cartão/boleto). Ao pagar, o pedido avança para **"pago"** automaticamente — **somente** por confirmação do gateway (webhook), nunca por ação do cliente.

**Why this priority**: fecha o ciclo de venda; sem ela o pedido nunca é confirmado como pago.

**Independent Test** (sandbox): criar pedido no checkout, gerar a cobrança, pagar no ambiente de testes do Mercado Pago, e verificar que o pedido vira "pago" só após o webhook — e que o cliente sozinho não consegue marcar como pago.

**Acceptance Scenarios**:

1. **Given** um pedido "aguardando pagamento", **When** o cliente inicia o pagamento, **Then** o sistema gera a cobrança no Mercado Pago para o método escolhido e apresenta a forma de pagar (QR/checkout do gateway).
2. **Given** o pagamento confirmado pelo gateway, **When** o webhook é recebido e validado, **Then** o pedido avança para "pago" e o cliente vê o status atualizado em "Meus pedidos".
3. **Given** qualquer tentativa do cliente de marcar o pedido como pago, **When** ela ocorre, **Then** é negada — só o webhook (servidor) avança para "pago".

---

### User Story 2 - Pagamento expira e o estoque é devolvido (Priority: P1)

Um pedido `aguardando_pagamento` que não é pago dentro da janela definida é **cancelado automaticamente** e o **estoque é devolvido**, sem intervenção manual.

**Why this priority**: evita estoque preso indefinidamente em pedidos que nunca serão pagos.

**Independent Test**: criar pedido, não pagar, avançar o relógio além da janela; verificar que uma rotina agendada cancela o pedido e devolve o estoque (reusando o cancelamento existente).

**Acceptance Scenarios**:

1. **Given** um pedido "aguardando pagamento" além da janela de expiração, **When** a rotina agendada roda, **Then** o pedido é cancelado e o estoque das variações/produtos é devolvido atomicamente.
2. **Given** um pedido que foi pago dentro da janela, **When** a rotina roda, **Then** ele NÃO é cancelado.

---

### Edge Cases

- **Webhook duplicado/fora de ordem**: processamento **idempotente** — o mesmo evento não avança o pedido duas vezes; eventos fora de ordem são reconciliados pelo estado real na API do gateway.
- **Assinatura inválida**: webhook sem assinatura válida é rejeitado.
- **Divergência gateway × pedido**: reconciliação consulta a API do Mercado Pago como fonte da verdade do pagamento.
- **Pagamento após expiração** (pedido já cancelado/estoque devolvido): tratado explicitamente (reembolso/reprocessamento — a definir no clarify do M4b).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST gerar a cobrança no Mercado Pago a partir de um pedido "aguardando pagamento", para o método escolhido no checkout, via processamento no **servidor** (Cloud Functions).
- **FR-002**: O avanço do pedido para **"pago"** MUST ocorrer SOMENTE por confirmação do gateway (webhook) validada no servidor — nunca por ação do cliente.
- **FR-003**: O webhook MUST validar a **assinatura** do Mercado Pago, ser **idempotente** (evento repetido não reprocessa) e **reconciliar** o estado consultando a API do gateway.
- **FR-004**: Uma rotina **agendada** MUST expirar pedidos "aguardando pagamento" além da janela definida, **cancelando** o pedido e **devolvendo o estoque** de forma transacional (reusando o cancelamento existente do M3).
- **FR-005**: A integração MUST plugar na **interface de provedor de pagamento** definida na M4a, sem reescrever o checkout.
- **FR-006**: O papel de **admin** MUST migrar para **custom claims** (autorização de servidor), substituindo a verificação atual baseada em documento, para as operações sensíveis de pagamento/pedido.
- **FR-007**: Segredos do Mercado Pago (token/chave de webhook) MUST ficar apenas no servidor (Functions), nunca no cliente.

### Key Entities *(include if feature involves data)*

- **Pagamento/cobrança**: vínculo entre o pedido e a transação no Mercado Pago (id externo, status, método); fonte de reconciliação.
- **Pedido**: passa a ter o ciclo `aguardando_pagamento → pago` (via webhook) ou `→ cancelado` (via expiração), além dos avanços do admin (M3).
- **Evento de webhook**: registro idempotente dos eventos recebidos (para não reprocessar).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um pedido só vira "pago" após confirmação real do gateway; nenhum caminho do cliente marca "pago".
- **SC-002**: Webhooks duplicados/fora de ordem nunca avançam o pedido mais de uma vez (idempotência) e o estado final bate com a API do gateway (reconciliação).
- **SC-003**: Todo pedido não pago dentro da janela é cancelado e tem o estoque devolvido automaticamente.
- **SC-004**: Segredos do gateway nunca chegam ao cliente; a autorização admin usa custom claims no servidor.

## Assumptions / Dependencies

- **Depende do plano Blaze** (Cloud Functions + Cloud Scheduler/tarefas agendadas). Sem Blaze, a feature não inicia.
- Reutiliza: a interface de pagamento e o pedido "aguardando pagamento" da M4a; a transação de cancelamento/devolução de estoque do M3; o número/estrutura de pedido existentes.
- Ambiente de sandbox do Mercado Pago para testes antes de produção (detalhes no clarify do M4b).
- Requer configuração de credenciais do Mercado Pago (passo operacional do lojista).

## Notes

- Esta spec é o **registro** da M4b para quando o Blaze estiver ativo. Ao iniciar: criar a branch `010-pagamento-mercadopago`, rodar `/speckit-clarify` (sandbox/produção, janela de expiração, política de pagamento-após-expiração), depois plan/tasks/analyze/implement.
