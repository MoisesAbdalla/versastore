# Feature Specification: Variações por Atributo

**Feature Branch**: `008-variacoes-por-atributo`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: repensar o modelo e o seletor de variações (admin + vitrine): declarar o conjunto de atributos do produto, validar consistência no admin, e trocar o seletor da vitrine de "por combinação" para "por atributo".

## Contexto do problema

Hoje o admin salva variações com atributos vazios (sem validação) e a vitrine mostra um botão por variação (seleção "por combinação"). Isso produz dois defeitos:

- **Dados inconsistentes**: variações do mesmo produto acabam com conjuntos de atributos diferentes (ex.: "preta / único" ao lado de "azul" sem tamanho), porque os campos de atributo são opcionais e nada declara quais atributos o produto tem.
- **UX ruim**: um produto com 4 tamanhos × 5 cores vira 20 botões numa fila só, sem organização por atributo.

O objetivo é: cada produto declara seus atributos (ex.: Tamanho, Cor; ou só Voltagem; ou Tamanho + Cor + Material); todas as variações compartilham exatamente esse conjunto; e o cliente escolhe uma opção por atributo, com o sistema resolvendo a variação correspondente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lojista cadastra variações consistentes por atributo (Priority: P1)

O lojista define, no cadastro/edição de um produto, **quais atributos** aquele produto tem (ex.: Tamanho e Cor) e adiciona variações preenchendo **um valor para cada atributo**, mais estoque, SKU e preço opcional por variação. O sistema impede salvar/publicar variações inconsistentes.

**Why this priority**: é a fundação — sem dados consistentes (todas as variações com o mesmo conjunto de atributos, todos preenchidos), o seletor por atributo da vitrine não tem como funcionar. Também é a raiz do bug de dados relatado.

**Independent Test**: cadastrar um produto com atributos Tamanho e Cor, tentar salvar uma variação com um atributo vazio (bloqueado com mensagem clara), tentar duplicar uma combinação (bloqueado), e então salvar um conjunto válido — verificando que o produto guarda a lista de atributos e as variações completas.

**Acceptance Scenarios**:

1. **Given** um produto novo, **When** o lojista adiciona os atributos "Tamanho" e "Cor", **Then** o editor de variações passa a pedir um valor de Tamanho e um de Cor por variação (uma coluna por atributo).
2. **Given** uma variação com "Cor" preenchida e "Tamanho" vazio, **When** o lojista tenta salvar, **Then** o sistema bloqueia e aponta o campo faltante.
3. **Given** duas variações com a mesma combinação (ex.: "P / Azul" repetida), **When** o lojista tenta salvar, **Then** o sistema bloqueia e sinaliza a duplicidade.
4. **Given** um produto com variações válidas mas com um atributo faltando em uma delas, **When** o lojista tenta mudar o status para "ativo" (publicar), **Then** a publicação é bloqueada até a inconsistência ser corrigida.
5. **Given** um produto com atributos Tamanho e Cor, **When** o lojista adiciona um terceiro atributo "Material", **Then** o editor passa a exigir Material em todas as variações (comportamento detalhado depende da decisão de mutabilidade — ver Clarifications).

---

### User Story 2 - Cliente escolhe a variação por atributo (Priority: P1)

Na página do produto, o cliente vê **uma linha de opções por atributo** (ex.: Tamanho: P M G GG / Cor: preta azul verde). Ao escolher um valor, as opções do(s) outro(s) atributo(s) que não formam combinação disponível ficam desabilitadas/riscadas. O estoque e o botão de compra só reagem quando **todos** os atributos estiverem escolhidos, resolvendo a variação única. A ordem de escolha é livre.

**Why this priority**: é o ganho de UX que motiva a feature e o que o cliente efetivamente usa para comprar; sem isso o valor não se realiza.

**Independent Test**: num produto com 2 atributos, escolher um Tamanho e ver Cores indisponíveis desabilitadas; completar a seleção e ver o estoque/preço daquela variação e o botão habilitar; testar também um produto de 1 atributo (só Tamanho) e um de 3 atributos.

**Acceptance Scenarios**:

1. **Given** um produto com Tamanho e Cor, **When** o cliente seleciona "P", **Then** as cores que não existem (ou estão esgotadas) para "P" aparecem desabilitadas/riscadas.
2. **Given** nenhum atributo escolhido ainda, **When** o cliente olha o botão de compra, **Then** ele não permite comprar e há orientação para selecionar as opções.
3. **Given** todos os atributos escolhidos, **When** a combinação resolve uma variação com estoque, **Then** o estoque daquela variação é exibido e o botão "Adicionar ao carrinho" habilita.
4. **Given** todos os atributos escolhidos, **When** a combinação resolvida está esgotada, **Then** o botão fica como "Esgotado" (desabilitado).
5. **Given** um produto com um único atributo (ex.: Voltagem: 110V 220V), **When** o cliente escolhe um valor, **Then** a variação é resolvida imediatamente (não exige outros atributos).
6. **Given** um produto com três atributos (Tamanho, Cor, Material), **When** o cliente escolhe em qualquer ordem, **Then** cada escolha filtra as opções restantes e a compra só habilita com os três definidos.

---

### User Story 3 - Migração e sinalização dos produtos legados (Priority: P2)

Os produtos já cadastrados (modelo antigo, sem lista de atributos declarada e possivelmente com atributos vazios/divergentes) são normalizados por uma rotina de migração **idempotente**: para cada produto, ela deriva a lista de atributos a partir das chaves preenchidas em **todas** as variações e remove chaves vazias. Produtos cujas variações **discordam** do conjunto de atributos são **sinalizados para revisão manual** — a rotina não adivinha nem inventa valores.

**Why this priority**: garante que o catálogo existente continue coerente após a mudança de modelo, sem corromper dados nem exigir recadastro manual em massa; mas depende de US1 (modelo) já existir.

**Independent Test**: rodar a migração sobre uma base com (a) produto consistente 2-atributos, (b) produto simples sem variação, e (c) produto inconsistente ("azul" sem tamanho); verificar que (a) recebe a lista de atributos correta, (b) fica sem atributos, (c) é marcado para revisão; rodar de novo e confirmar que nada muda (idempotência).

**Acceptance Scenarios**:

1. **Given** um produto cujas variações têm todas Tamanho e Cor preenchidos, **When** a migração roda, **Then** o produto passa a declarar [Tamanho, Cor] e nada mais muda numa segunda execução.
2. **Given** um produto cujas variações discordam (uma tem Tamanho, outra não), **When** a migração roda, **Then** o produto é marcado como "precisa de revisão" e **não** é alterado automaticamente.
3. **Given** um produto sem nenhuma variação, **When** a migração roda, **Then** ele permanece como produto simples (sem atributos) e continua comprável pelo estoque geral.
4. **Given** um produto marcado como "precisa de revisão", **When** o lojista corrige as variações no admin de forma a satisfazer as validações da US1, **Then** a marca de revisão é removida.

---

### Edge Cases

- **Produto simples (sem variação)**: lista de atributos vazia/ausente → compra usa o estoque geral do produto; a página não mostra seletor. NÃO pode quebrar.
- **Todas as combinações esgotadas**: produto aparece com "Esgotado"; seletor visível mas compra bloqueada.
- **Seleção parcial**: enquanto faltar escolher algum atributo, não há estoque/preço de variação resolvido nem compra.
- **Combinação inexistente**: um par de valores que não corresponde a nenhuma variação cadastrada fica indisponível (desabilitado), nunca resolve compra.
- **Produto sinalizado como inconsistente na vitrine**: comportamento a definir — ver Clarifications (esconder do catálogo / mostrar sem seletor bloqueando compra / bloquear só a compra).
- **Pedidos e carrinho já existentes**: itens de pedido são congelados no momento da compra e guardam o rótulo da variação; a mudança de modelo NÃO os altera (pedido histórico é imutável). Carrinho salvo continua válido: o rótulo já gravado é preservado e a revalidação contra o produto atual segue funcionando.
- **Mudar atributos de um produto já publicado/vendido**: ver Clarifications (impacto em migração e integridade).
- **Muitos valores/atributos**: um produto com muitas combinações (ex.: 3 atributos) ainda deve exibir o seletor de forma legível (uma linha por atributo, não a explosão de combinações).

## Requirements *(mandatory)*

### Functional Requirements

**Modelo e consistência**

- **FR-001**: O sistema MUST permitir que cada produto declare uma lista **ordenada** de nomes de atributos (0..N), representando os eixos de variação daquele produto (ex.: [Tamanho, Cor]).
- **FR-002**: Toda variação de um produto MUST fornecer um valor **não vazio** para **cada** atributo declarado do produto — nem mais, nem menos.
- **FR-003**: Um produto MAY não ter atributos nem variações (produto simples); nesse caso a disponibilidade e a compra usam o estoque geral do produto, sem seletor.
- **FR-004**: A mudança MUST ser **aditiva e retrocompatível**: produtos e variações existentes continuam legíveis; a introdução da lista de atributos não invalida documentos antigos antes da migração.

**Admin (cadastro/edição)**

- **FR-005**: O lojista MUST poder definir e reordenar os nomes de atributos de um produto, e o editor de variações MUST refletir dinamicamente um campo por atributo declarado (em vez de campos fixos de Tamanho/Cor).
- **FR-006**: Ao salvar, o sistema MUST bloquear e sinalizar, campo a campo, quando (a) alguma variação tem atributo vazio, (b) há combinação de atributos duplicada entre variações, ou (c) as variações não compartilham o mesmo conjunto de atributos.
- **FR-007**: O sistema MUST impedir **publicar** (status ativo) um produto com variações inconsistentes segundo FR-006, com mensagem clara do que corrigir.
- **FR-008**: Estoque, SKU e preço opcional MUST continuar sendo **por variação** (comportamento atual preservado).

**Vitrine (página do produto)**

- **FR-009**: A página do produto MUST apresentar as opções **agrupadas por atributo** (uma linha por atributo), suportando corretamente 1, 2 e 3+ atributos.
- **FR-010**: Ao selecionar um valor de atributo, o sistema MUST desabilitar/sinalizar os valores dos demais atributos que não formam combinação disponível (inexistente ou esgotada) com a seleção atual.
- **FR-011**: A ordem de seleção dos atributos MUST ser livre (qualquer atributo primeiro).
- **FR-012**: O estoque exibido e o botão "Adicionar ao carrinho" MUST reagir **apenas** quando todos os atributos estiverem selecionados e a combinação resolver uma única variação; com seleção incompleta, a compra não é permitida e há orientação para completar a escolha.
- **FR-013**: O produto simples (sem atributos) MUST continuar comprável diretamente, sem seletor.

**Migração e integridade**

- **FR-014**: O sistema MUST oferecer uma rotina de migração **idempotente** que, por produto, deriva a lista de atributos a partir das chaves preenchidas em **todas** as variações e remove chaves vazias; rodar a rotina novamente NÃO MUST produzir mudanças adicionais.
- **FR-015**: A migração MUST **sinalizar para revisão manual** (sem alterar) os produtos cujas variações discordam do conjunto de atributos, e NÃO MUST inventar/adivinhar valores.
- **FR-016**: O lojista MUST poder identificar quais produtos estão sinalizados para revisão e, ao corrigi-los conforme FR-006, a sinalização MUST ser removida.
- **FR-017**: A vitrine MUST tratar de forma definida um produto sinalizado como inconsistente enquanto não corrigido [NEEDS CLARIFICATION: comportamento na vitrine para produto inconsistente — esconder do catálogo, mostrar sem seletor bloqueando a compra, ou bloquear apenas a compra?].
- **FR-018**: Itens de pedidos já existentes MUST permanecer imutáveis e preservar o rótulo da variação comprada; a mudança de modelo NÃO MUST alterar pedidos históricos nem remover a informação da variação já congelada.
- **FR-019**: Carrinhos já salvos MUST continuar válidos: o rótulo de variação já gravado é preservado e a revalidação de disponibilidade/preço contra o produto atual segue funcionando.

**Mutabilidade após publicação**

- **FR-020**: O sistema MUST definir se e como os atributos de um produto **já publicado** (com variações e possivelmente com vendas) podem ser alterados [NEEDS CLARIFICATION: permitir livremente / permitir só quando não há variações / permitir exigindo re-preenchimento de todas as variações / travar após publicado].

### Key Entities *(include if feature involves data)*

- **Produto**: item do catálogo. Novo atributo: **lista ordenada de nomes de atributos** (eixos de variação; vazia para produto simples). Estado adicional: **sinalização de "precisa de revisão"** para casos inconsistentes detectados na migração. Mantém estoque geral (usado quando simples), status (rascunho/ativo/inativo), etc.
- **Variação**: opção comprável de um produto. Guarda um **valor por atributo declarado** (conjunto idêntico entre todas as variações do produto), além de estoque, SKU e preço opcional. A combinação de valores é única dentro do produto.
- **Item de pedido (congelado)**: registro imutável do que foi comprado, incluindo o **rótulo da variação** no momento da compra. Não é afetado por mudanças no produto/variação vivos.
- **Item de carrinho**: linha persistida com identidade por produto+variação e rótulo já derivado; revalidada contra o produto atual ao abrir o carrinho.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das variações de produtos publicados compartilham o mesmo conjunto de atributos, todos preenchidos (nenhuma variação publicada com atributo vazio ou conjunto divergente).
- **SC-002**: É impossível publicar um produto com variação inconsistente (atributo vazio, combinação duplicada ou conjunto divergente) — a tentativa é bloqueada com indicação do problema.
- **SC-003**: Na página do produto, com qualquer número de atributos (1, 2 ou 3+), o cliente consegue chegar a uma variação comprável selecionando um valor por atributo em qualquer ordem; o botão de compra nunca habilita com seleção incompleta ou combinação esgotada.
- **SC-004**: Combinações indisponíveis (inexistentes ou esgotadas) aparecem desabilitadas/sinalizadas assim que a seleção parcial as torna impossíveis (o cliente não consegue selecionar uma combinação sem estoque).
- **SC-005**: A migração é idempotente: uma segunda execução sobre a mesma base não altera nenhum documento.
- **SC-006**: Nenhum produto é alterado automaticamente quando suas variações são inconsistentes — todos esses casos ficam sinalizados para revisão manual.
- **SC-007**: Produtos simples (sem variação) continuam compráveis exatamente como antes (nenhuma regressão no fluxo de compra do caso simples).
- **SC-008**: Nenhum pedido histórico perde a informação da variação comprada após a mudança de modelo (o rótulo permanece idêntico ao gravado na compra).

## Assumptions

- O armazenamento atual da variação já é um mapa de atributos por variação, então declarar a lista de atributos do produto é uma extensão **aditiva** — produtos antigos permanecem legíveis até a migração normalizá-los.
- Os nomes de atributos são livres (definidos pelo lojista), não um conjunto fixo — o modelo precisa suportar atributos como Voltagem ou Material, não só Tamanho/Cor.
- A quantidade de atributos por produto é pequena na prática (tipicamente 1 a 3); o seletor prioriza legibilidade para esses casos, sem meta de suportar dezenas de eixos.
- A migração é uma rotina operacional do lojista/dev (no padrão dos backfills já existentes), executada uma vez após o deploy; não é um fluxo do cliente.
- Checkout/pagamento (M4) e emissão de nota (M8) permanecem fora de escopo; a feature não altera o congelamento de itens do pedido, apenas confirma que ele preserva o rótulo da variação.
- A feature não introduz novas escritas públicas: cadastro/validação de variações é do admin; a vitrine apenas lê.
- Reutiliza os padrões existentes (constantes de produto, componentes do admin, MainLayout/vitrine, feedback de estados) e o design system, sem quebrar Home, catálogo, carrinho persistente, painel admin nem a área de conta (007).
