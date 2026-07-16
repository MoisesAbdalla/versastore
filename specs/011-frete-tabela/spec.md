# Feature Specification: Frete por Tabela (M5a)

**Feature Branch**: `011-frete-tabela`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: cálculo de frete configurável no admin por tabela de regras (região/faixa de CEP e/ou faixa de valor), sem API externa nem Cloud Functions. Primeira de duas features do M5; a API real de frete é a M5b.

## Contexto e limites

O checkout (M4a) já cria o pedido com o campo `shipping` (hoje "a combinar", `shippingStatus: "a_calcular"`) e `total = subtotal + shipping`. Esta feature entrega o **cálculo de frete por tabela**: o lojista configura regras (por região/faixa de CEP e/ou faixa de valor) no admin, e o checkout passa a **calcular o frete a partir do CEP do cliente** e **preencher** o campo `shipping` — trocando o "a combinar" por um valor e prazo reais. O banner "Frete grátis acima de R$199" (hoje fixo no header) passa a refletir o **limite configurado**.

O cálculo fica atrás de uma **interface abstrata de frete** (um provedor de frete) com implementação por TABELA aqui; a **M5b** conecta a API real (Melhor Envio/SuperFrete) na mesma interface, sem reescrever o checkout. A M5b depende de infraestrutura de servidor ainda não disponível.

## Clarifications

### Session 2026-07-15

- Q: A tabela usa peso/dimensão dos produtos ou só região + faixa de valor? → A: **Só região + faixa de valor** na M5a. **Sem peso** — não adiciona campo de peso no produto agora; o peso fica para o **M5b** (a API real precisa dele, e lá decidimos como cadastrar). Mantém a M5a sem migração de produtos.
- Q: O que acontece quando o CEP não cai em nenhuma regra da tabela? → A: **Frete padrão configurável ("demais regiões")** — o lojista define um frete/prazo catch-all para CEPs não cobertos por regra específica. Se o lojista **não** definir esse padrão, o CEP sem regra **bloqueia** a finalização com aviso ("ainda não entregamos nessa região").
- Q: Retirada na loja é opção de frete na M5a? → A: **Fora de escopo da M5a.** A M5a foca no cálculo de frete por tabela (entrega por CEP). "Retirar na loja" (frete R$0, sem endereço) é um modo de entrega distinto, tratado como acréscimo posterior.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lojista configura a tabela de frete (Priority: P1)

O lojista abre uma tela no painel e define as regras de frete: por região (identificada por faixa de CEP) e/ou por faixa de valor do pedido, cada uma com valor e prazo estimado; e o limite de **frete grátis**. As regras ficam salvas e passam a valer no checkout.

**Why this priority**: sem a tabela configurada, o checkout não tem como calcular; é a fundação da feature e o que dá controle ao lojista.

**Independent Test**: cadastrar regras para 2–3 regiões com valores/prazos e um limite de frete grátis; salvar; recarregar e ver as regras persistidas.

**Acceptance Scenarios**:

1. **Given** o painel de frete, **When** o lojista adiciona uma região (ex.: "Sudeste") com faixa de CEP, valor e prazo, **Then** a regra é salva e listada.
2. **Given** regras existentes, **When** o lojista define o limite de frete grátis (ex.: R$199), **Then** o valor é salvo e passa a reger o banner e o cálculo.
3. **Given** uma regra inválida (faixa de CEP malformada, valor/prazo vazio, faixas sobrepostas), **When** o lojista tenta salvar, **Then** o sistema bloqueia e aponta o erro.

---

### User Story 2 - Cliente vê o frete calculado no checkout (Priority: P1)

No checkout, o cliente informa (ou confirma, a partir do endereço escolhido) o CEP; o sistema identifica a região (via ViaCEP), aplica a tabela e mostra o **frete e o prazo estimado**; o total passa a `subtotal + frete`. Pedidos acima do limite de frete grátis mostram frete R$0.

**Why this priority**: é o valor entregue ao cliente — saber quanto e em quanto tempo, e o total correto antes de confirmar.

**Independent Test**: no checkout, informar um CEP do Sudeste e ver o frete/prazo da regra do Sudeste no resumo e no total; subir o subtotal acima do limite e ver "Frete grátis".

**Acceptance Scenarios**:

1. **Given** carrinho e um CEP com regra aplicável, **When** o checkout calcula, **Then** o resumo mostra o valor do frete e o prazo estimado, e `total = subtotal + frete`.
2. **Given** um subtotal acima do limite de frete grátis, **When** o checkout calcula, **Then** o frete é **R$0** ("Frete grátis") e o total = subtotal.
3. **Given** o CEP alterado pelo cliente, **When** ele muda o CEP/endereço, **Then** o frete recalcula.
4. **Given** o pedido confirmado, **When** ele é criado, **Then** grava `shipping` (valor), o prazo/método estimado e o CEP usado, e `shippingStatus` deixa de ser "a_calcular".

---

### User Story 3 - Banner de frete grátis conectado ao valor real (Priority: P3)

O banner do topo ("Frete grátis acima de R$X") passa a exibir o **limite configurado** pelo lojista, em vez de um valor fixo.

**Why this priority**: coerência da vitrine com a regra real; pequeno, mas evita prometer um limite que não é o configurado.

**Independent Test**: mudar o limite no admin e ver o banner do header refletir o novo valor.

**Acceptance Scenarios**:

1. **Given** o limite configurado como R$150, **When** o cliente vê o header, **Then** o banner mostra "Frete grátis acima de R$150".

---

### Edge Cases

- **CEP sem regra**: aplica o frete padrão "demais regiões" se definido; senão, bloqueia a finalização com aviso (FR-010).
- **CEP inválido/não encontrado** (ViaCEP falhou): mostra erro no campo e não calcula; o cliente corrige o CEP.
- **Tabela vazia / não configurada**: sem regras, o checkout mantém "a combinar" e orienta (não inventa frete).
- **Faixas sobrepostas/ambíguas**: a configuração impede sobreposição; se ainda assim houver empate, aplica-se um critério determinístico (ex.: a primeira/mais específica) — documentado.
- **Mudança de tabela após o pedido criado**: o pedido guarda o frete **congelado** no momento da compra; alterar a tabela depois não muda pedidos existentes.
- **Frete grátis por valor vs. regra de região**: o limite de frete grátis prevalece (frete 0) mesmo que a região tenha valor.

## Requirements *(mandatory)*

### Functional Requirements

**Configuração no admin**

- **FR-001**: O lojista MUST poder cadastrar/editar/remover regras de frete numa tela do painel, cada regra com: **região** (identificada por uma ou mais **faixas de CEP**), **valor do frete** e **prazo estimado** (em dias). Suporte a múltiplas regiões (ex.: Sudeste, Sul, Nordeste, Norte, Centro-Oeste).
- **FR-002**: O lojista MAY definir regras/ajustes por **faixa de valor do pedido** (ex.: frete diferente até R$99, R$100–199…), combinando com a região.
- **FR-003**: O lojista MUST poder definir o **limite de frete grátis** (valor de pedido acima do qual o frete é R$0); um valor vazio/zero desliga o frete grátis.
- **FR-003a**: O lojista MAY definir um **frete padrão ("demais regiões")** — valor + prazo catch-all aplicado a CEPs não cobertos por nenhuma regra específica.
- **FR-004**: O sistema MUST validar as regras ao salvar: faixas de CEP bem formadas, valores/prazos preenchidos, **sem sobreposição** ambígua de faixas; erros apontados campo a campo.
- **FR-005**: As regras e o limite MUST persistir (configuração administrada, como a aparência da Home) e serem lidas pelo checkout e pelo banner.

**Cálculo no checkout**

- **FR-006**: O checkout MUST coletar/confirmar o **CEP** do cliente (a partir do endereço escolhido ou de um campo), validado/identificado por região via **ViaCEP** (reuso do M3).
- **FR-007**: O checkout MUST **calcular o frete** aplicando a tabela ao CEP (região) e ao subtotal (faixa de valor), exibindo **valor e prazo estimado** no resumo, com **`total = subtotal + frete`**.
- **FR-008**: Pedidos com subtotal **≥ limite de frete grátis** MUST ter frete **R$0** ("Frete grátis"), prevalecendo sobre o valor da região.
- **FR-009**: Ao mudar o CEP/endereço, o frete MUST recalcular.
- **FR-010**: Um CEP sem regra específica MUST aplicar o **frete padrão ("demais regiões")** se o lojista o definiu (FR-003a); se **não** houver frete padrão, o checkout MUST **bloquear** a finalização para aquele CEP com aviso claro ("ainda não entregamos nessa região"), sem inventar valor.

**Persistência no pedido**

- **FR-012**: Ao confirmar, o pedido MUST gravar o `shipping` (valor calculado), o **prazo/método estimado** e o **CEP** usado, e mudar `shippingStatus` de "a_calcular" para definido; o frete fica **congelado** no pedido (mudanças futuras na tabela não o alteram). O `total = subtotal + shipping` (comportamento já preparado pela M4a).

**Interface abstrata (preparação para M5b)**

- **FR-013**: O cálculo de frete MUST ficar atrás de uma **interface de provedor de frete** bem definida (ex.: "cotar frete para um CEP + subtotal/itens → opções com valor e prazo"); na M5a a implementação é por **tabela**. O checkout e o pedido MUST NOT depender da fonte do frete, para a M5b conectar a API real sem reescrever o checkout.

**Peso dos produtos**

- **FR-014**: A M5a MUST calcular o frete **apenas** por região (CEP) e faixa de valor do pedido — **sem** peso/dimensão. Nenhum campo de peso é adicionado ao produto nesta feature; peso fica para o M5b (API real).

### Key Entities *(include if feature involves data)*

- **Configuração de frete**: administrada pelo lojista. Contém a **lista de regras** (região → faixas de CEP, valor, prazo; opcionalmente faixas de valor), o **frete padrão "demais regiões"** (opcional, catch-all) e o **limite de frete grátis**. Fonte única lida pelo checkout e pelo banner.
- **Regra de frete**: região (faixas de CEP), valor, prazo estimado; opcionalmente condicionada a faixa de valor do pedido.
- **Pedido**: já tem `shipping`/`shippingStatus`/`total` (M4a). A M5a passa a **preencher** `shipping` e a gravar prazo/método estimado + CEP usado, congelados na compra.
- **Provedor de frete (interface)**: abstração do cálculo; na M5a, a implementação por tabela. Contrato estável para a M5b (API real).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O lojista configura regras de frete por região (com valor e prazo) e o limite de frete grátis sem ajuda técnica, e as regras passam a valer no checkout.
- **SC-002**: No checkout, para um CEP com regra, o cliente vê o **valor do frete e o prazo estimado** e um **total = subtotal + frete** corretos antes de confirmar.
- **SC-003**: Pedidos acima do limite configurado mostram **frete grátis (R$0)**; o banner do header reflete o **mesmo** limite.
- **SC-004**: Todo pedido criado grava o frete **congelado** (valor + prazo + CEP); alterar a tabela depois não muda pedidos já feitos.
- **SC-005**: Um CEP inválido ou sem regra é tratado de forma clara (sem inventar frete nem quebrar o checkout).
- **SC-006**: Trocar a fonte do frete (tabela → API real no M5b) não exige reescrever o checkout — só a implementação por trás da interface.

## Out of Scope — pendente para o M5b (documentado, NÃO implementado aqui)

- Cloud Function que consulta a **API real de frete** (Melhor Envio/SuperFrete) com a chave protegida no servidor, retornando opções reais (PAC/SEDEX/transportadora) com valor e prazo por CEP.
- Substituição da implementação por tabela pela API real, plugando no mesmo provedor de frete.
- **Peso/dimensão** dos produtos (campo novo + cadastro), necessário para a cotação da API (decidir no M5b).
- Qualquer chamada a serviço externo de frete, etiquetas, ou integração de postagem.
- **Retirada na loja** (modo de entrega com frete R$0, sem endereço) — não é o cálculo de frete por tabela; fica como acréscimo posterior.

## Assumptions

- O checkout (M4a) e o campo `shipping`/`shippingStatus`/`total` do pedido já existem e são reutilizados — a M5a apenas preenche o frete.
- ViaCEP (M3) já é usado para endereços e é reutilizado para validar/identificar o CEP; a **região** é derivada do CEP/UF.
- A configuração de frete é administrada pelo lojista e persistida como as demais configurações do painel (ex.: aparência da Home).
- O rastreio do pedido (`trackingCode`) já existe (M3) e **não** é duplicado aqui.
- Frete real por API, peso e transportadoras ficam para a M5b; a M5a é 100% tabela local (sem servidor).
- O frete é **congelado** no pedido na compra (não recalculado retroativamente).
