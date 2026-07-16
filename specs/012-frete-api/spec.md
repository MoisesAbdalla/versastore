# Feature Specification: Frete por API real — Melhor Envio/SuperFrete (M5b)

**Feature Branch**: `012-frete-api` (a criar quando iniciar)

**Created**: 2026-07-15

**Status**: Draft — **BLOQUEADA até o plano Blaze do Firebase estar ativo** (Cloud Functions exigem Blaze)

**Input**: User description: segunda feature do M5 — substituir a tabela de frete (M5a) por cotação em API real (Melhor Envio/SuperFrete), plugando no provedor de frete abstrato deixado pela M5a.

## Contexto e pré-requisito

A M5a (frete por tabela, feature 011) calcula o frete por uma tabela local e deixa o cálculo atrás de uma **interface de provedor de frete**. A M5b conecta a **API real** de frete a essa interface, no servidor. **Pré-requisito duro:** plano **Blaze** ativo (Cloud Functions — a chave da API não pode ir ao cliente). Enquanto o Blaze não estiver ativo, esta feature não é iniciada.

Quando iniciar, esta spec deve passar por `/speckit-clarify` (ex.: qual provedor — Melhor Envio vs SuperFrete; origem/CEP de despacho; quais serviços exibir; cache/timeout da cotação; peso/dimensão dos produtos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cliente vê opções reais de frete no checkout (Priority: P1)

No checkout, ao informar o CEP, o cliente recebe **opções reais de frete** (ex.: PAC, SEDEX, transportadora) com **valor e prazo** vindos da API, e escolhe uma; o valor escolhido preenche o `shipping` do pedido.

**Why this priority**: entrega frete preciso por transportadora, substituindo a estimativa por tabela.

**Independent Test** (sandbox): com credenciais de teste, cotar um CEP e ver as opções reais (valor/prazo); escolher uma e confirmar o pedido com esse frete.

**Acceptance Scenarios**:

1. **Given** carrinho + CEP, **When** o checkout cota o frete, **Then** o servidor consulta a API e retorna as opções reais (serviço, valor, prazo).
2. **Given** as opções, **When** o cliente escolhe uma, **Then** o pedido grava aquele serviço/valor/prazo no `shipping`.
3. **Given** a API indisponível/timeout, **When** a cotação falha, **Then** o checkout degrada de forma definida (ex.: cai para a tabela do M5a ou mostra "a combinar") — a decidir no clarify.

---

### Edge Cases

- **API fora do ar / timeout**: fallback definido (tabela M5a? "a combinar"?) — clarify.
- **CEP sem cobertura de nenhuma transportadora**: tratamento claro.
- **Peso/dimensão faltando** no produto: a API precisa de peso — origem desse dado (campo no produto, default por categoria?) — clarify.
- **Divergência de valor** entre cotação e postagem real: a cotação é estimada; o valor cobrado é o do momento da compra (congelado no pedido, como na M5a).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST cotar o frete via **API real** (Melhor Envio/SuperFrete) no **servidor** (Cloud Functions), com a **chave protegida** (nunca no cliente).
- **FR-002**: O checkout MUST plugar na **interface de provedor de frete** definida na M5a, sem reescrever o checkout — só troca a implementação (tabela → API).
- **FR-003**: A cotação MUST retornar opções reais (serviço, valor, prazo) por CEP + itens (peso/dimensão), e o cliente MUST poder escolher uma.
- **FR-004**: O frete escolhido MUST ser gravado congelado no pedido (`shipping` + serviço + prazo), como na M5a.
- **FR-005**: O sistema MUST definir o **peso/dimensão** dos itens para a cotação [clarify: campo no produto, default por categoria, etc.].
- **FR-006**: A falha/timeout da API MUST ter **fallback** definido [clarify: tabela M5a, "a combinar", ou bloquear].
- **FR-007**: Segredos da API de frete MUST ficar apenas no servidor.

### Key Entities *(include if feature involves data)*

- **Cotação de frete**: opções (serviço, valor, prazo) retornadas pela API para um CEP + itens.
- **Produto**: pode ganhar **peso/dimensão** (se necessário para a cotação — clarify).
- **Pedido**: `shipping` passa a refletir a opção real escolhida (congelada).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O cliente vê e escolhe opções reais de frete (valor/prazo por transportadora) no checkout.
- **SC-002**: A chave da API nunca chega ao cliente (cotação 100% no servidor).
- **SC-003**: Falha da API não quebra o checkout — há fallback definido.
- **SC-004**: O frete escolhido fica congelado no pedido.

## Assumptions / Dependencies

- **Depende do plano Blaze** (Cloud Functions). Sem Blaze, não inicia.
- Reutiliza: a **interface de provedor de frete** e o campo `shipping`/`total` da M5a; o checkout da M4a.
- Requer conta + credenciais no provedor (Melhor Envio/SuperFrete) e ambiente de sandbox para testes (passo operacional do lojista).

## Notes

- Registro da M5b para quando o Blaze estiver ativo. Ao iniciar: criar a branch `012-frete-api`, rodar `/speckit-clarify` (provedor, origem de despacho, serviços, timeout/fallback, peso), depois plan/tasks/analyze/implement. Depende de [[feature-011-frete-tabela]] mergeada e do mesmo Blaze da [[feature-010-pagamento-mercadopago]].
