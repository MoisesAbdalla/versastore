# Feature Specification: Produto em Destaque (Admin + Home)

**Feature Branch**: `002-adicionar-campo-produto-destaque`

**Created**: 2026-07-10

**Status**: Draft

**Input**: User description: "Quero permitir que, ao cadastrar ou editar um produto no painel Admin, seja possível marcar esse produto como 'Produto em Destaque'. Cadastro/Edição de produto: adicionar checkbox/toggle 'Marcar como produto em destaque', salvar como campo booleano `destaque` no Firestore (padrão false), editável depois, sem limite de quantos produtos podem ser destaque. Home: a seção 'Produtos em Destaque' deve buscar do Firestore apenas produtos com destaque=true, em ordem aleatória a cada carregamento, com estado vazio 'Em breve' quando não houver nenhum. Produtos antigos sem o campo não precisam de migração automática. Manter a estrutura de componentes/serviços existente (frontend/src/services, frontend/src/firebase) sem quebrar o cadastro já funcional."

## Clarifications

### Session 2026-07-10

- Q: O Admin hoje só tem tela de cadastro (criar produto novo) — não existe listagem nem edição de
  produtos já cadastrados. Construir a edição do zero é um escopo bem maior que só o checkbox de
  destaque. Qual o escopo esperado? → A: Construir edição completa de produto — lista de produtos
  cadastrados, seleção de um deles, e formulário de edição com todos os campos (nome, categoria,
  preço, estoque, descrição, imagem, destaque), não só o campo destaque.
- Q: Na tela de edição, escolher uma nova imagem deve ser opcional (mantém a atual se nada for
  selecionado) ou continua obrigatório re-selecionar uma imagem toda vez que salvar? → A: Opcional —
  se o admin não selecionar um arquivo novo, a imagem atual (URL já salva) é mantida sem re-upload.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Marcar produto como destaque ao cadastrar (Priority: P1)

Como administrador da loja, quero marcar um produto como "em destaque" no momento em que o
cadastro, para que ele já apareça na vitrine da Home assim que eu terminar o cadastro, sem precisar
de um passo extra depois.

**Why this priority**: É o pedido central e mais simples de entregar — um campo a mais no formulário
já existente. Sem isso, nenhuma das outras partes (Home lendo do Firestore) tem dado real para
mostrar.

**Independent Test**: Pode ser testado isoladamente preenchendo o formulário de cadastro em
`/admin`, marcando o checkbox "Marcar como produto em destaque", salvando, e conferindo que o
documento criado no Firestore tem `destaque: true` — sem depender da Home estar lendo do Firestore
ainda.

**Acceptance Scenarios**:

1. **Given** o administrador está preenchendo o formulário de cadastro de produto, **When** ele
   marca o checkbox "Marcar como produto em destaque" e salva, **Then** o produto é criado no
   Firestore com o campo `destaque` igual a `true`.
2. **Given** o administrador está preenchendo o formulário de cadastro de produto, **When** ele
   **não** marca o checkbox e salva, **Then** o produto é criado no Firestore com o campo `destaque`
   igual a `false`.
3. **Given** o cadastro é concluído com sucesso, **When** o formulário é limpo para um novo cadastro
   (comportamento já existente), **Then** o checkbox de destaque volta ao estado desmarcado (padrão).

---

### User Story 2 - Home exibe produtos em destaque reais, embaralhados (Priority: P2)

Como visitante da Home, quero ver na seção "Produtos em Destaque" produtos reais escolhidos pelo
administrador (não mais os dois produtos de teste fixos), em uma ordem que varia a cada visita, para
que a vitrine reflita o catálogo de verdade e pareça viva.

**Why this priority**: Depende do campo existir (US1) para ter dado para ler, mas é a entrega que o
cliente final efetivamente vê — completa o valor de ponta a ponta do pedido.

**Independent Test**: Pode ser testado isoladamente marcando alguns produtos como destaque
diretamente no Firestore (ou via US1 já implementada) e verificando que a Home passa a exibir
exatamente esses produtos, em ordens diferentes em recarregamentos sucessivos, e que produtos com
`destaque` ausente ou `false` não aparecem.

**Acceptance Scenarios**:

1. **Given** existem produtos no Firestore com `destaque: true`, **When** a Home carrega, **Then** a
   seção "Produtos em Destaque" exibe exatamente esses produtos (nenhum com `destaque` ausente ou
   `false`).
2. **Given** a Home é recarregada múltiplas vezes com o mesmo conjunto de produtos em destaque,
   **When** cada carregamento acontece, **Then** a ordem de exibição pode variar entre os
   carregamentos (não é sempre a mesma ordem fixa).
3. **Given** nenhum produto no Firestore tem `destaque: true`, **When** a Home carrega, **Then** a
   seção "Produtos em Destaque" exibe uma mensagem de estado vazio (ex.: "Em breve") no lugar da
   grade/carrossel de produtos.

---

### User Story 3 - Editar um produto já cadastrado, incluindo o destaque (Priority: P3)

Como administrador, quero ver a lista de produtos já cadastrados, escolher um deles e editar
qualquer um de seus campos (incluindo nome, categoria, preço, estoque, descrição, imagem e
destaque), para manter o catálogo atualizado ao longo do tempo sem precisar recriar produtos do
zero.

**Why this priority**: É o complemento natural do US1/US2, mas exige construir uma superfície de
edição de produto que **ainda não existe** no painel Admin hoje (o Admin atual só cadastra produtos
novos — não lista nem edita os já criados). Por isso vem depois: US1 e US2 já entregam valor real
(destacar produtos no cadastro, Home mostrando destaque real) mesmo antes de existir a tela de
edição completa.

**Independent Test**: Pode ser testado isoladamente abrindo a lista de produtos no Admin,
selecionando um produto existente, alterando um ou mais campos (incluindo o destaque) no formulário
de edição, salvando, e conferindo que o documento correspondente no Firestore reflete exatamente os
novos valores — e que os campos não alterados permanecem intactos.

**Acceptance Scenarios**:

1. **Given** o administrador está no Admin, **When** ele acessa a área de produtos cadastrados,
   **Then** vê uma lista dos produtos já existentes no Firestore (ao menos nome e indicação se está
   em destaque).
2. **Given** o administrador seleciona um produto da lista, **When** a tela de edição abre, **Then**
   o formulário vem pré-preenchido com os valores atuais do produto (nome, categoria, preço,
   estoque, descrição, imagem, destaque).
3. **Given** um produto já cadastrado com `destaque: false` (ou sem o campo), **When** o
   administrador ativa o checkbox de destaque na tela de edição e salva, **Then** o campo `destaque`
   do produto no Firestore passa a `true`, sem alterar os demais campos que não foram modificados.
4. **Given** um produto já cadastrado com `destaque: true`, **When** o administrador desativa o
   destaque e salva, **Then** o campo `destaque` do produto no Firestore passa a `false`, sem
   alterar os demais campos que não foram modificados.
5. **Given** o administrador altera outros campos do produto (ex.: preço, estoque, descrição) na
   tela de edição, **When** ele salva, **Then** o documento no Firestore reflete os novos valores
   desses campos, mantendo o mesmo identificador do produto (não cria um produto duplicado).
6. **Given** o administrador está editando um produto e não seleciona nenhuma imagem nova, **When**
   ele salva as demais alterações, **Then** o salvamento é concluído normalmente e a imagem
   originalmente salva do produto permanece inalterada.

---

### Edge Cases

- Produtos cadastrados antes desta funcionalidade não têm o campo `destaque` no documento — a busca
  da Home por `destaque = true` MUST tratá-los como "não destacado" (ausência do campo é equivalente
  a `false` para fins de exibição), sem exigir migração de dados nem gerar erro.
- Se todos os produtos em destaque forem removidos do destaque (ou excluídos) entre um carregamento
  e outro da Home, a seção MUST voltar a mostrar o estado vazio ("Em breve") no próximo
  carregamento.
- Não há limite de quantos produtos podem estar em destaque simultaneamente; a seção "Produtos em
  Destaque" da Home MUST continuar funcional (sem quebrar layout ou navegação) independentemente de
  quantos produtos vierem marcados.
- Falha ao buscar produtos em destaque do Firestore (ex.: sem conexão) MUST ser tratada de forma que
  a Home continue utilizável (sem quebrar a página), com a seção exibindo um estado apropriado em
  vez de travar ou lançar erro visível ao usuário.
- Na tela de edição, se o administrador não selecionar uma nova imagem, o sistema MUST NOT bloquear
  o salvamento nem exigir seleção de arquivo (diferente da regra do cadastro novo, onde a imagem é
  obrigatória) — a imagem já salva do produto é reaproveitada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O formulário de cadastro de produto no Admin MUST exibir um campo do tipo
  checkbox/toggle rotulado como "Marcar como produto em destaque".
- **FR-002**: Ao salvar um novo produto, o sistema MUST gravar no documento do produto no Firestore
  um campo booleano `destaque`, com o valor `true` quando o checkbox estiver marcado e `false`
  quando não estiver marcado (nunca omitido/indefinido para produtos criados a partir de agora).
- **FR-003**: O Admin MUST oferecer uma área de listagem dos produtos já cadastrados no Firestore
  (ao menos nome e indicação de destaque de cada um), a partir da qual o administrador consegue
  escolher um produto para editar.
- **FR-003a**: Ao escolher um produto na listagem, o Admin MUST abrir um formulário de edição
  pré-preenchido com os valores atuais de todos os campos do produto (nome, categoria, preço,
  estoque, descrição, imagem e destaque).
- **FR-003b**: O sistema MUST permitir que o administrador altere qualquer campo do produto na tela
  de edição — incluindo, mas não limitado a, ativar/desativar o campo `destaque` — e salvar essas
  mudanças de volta no mesmo documento do Firestore (sem criar um novo produto/documento duplicado e
  sem apagar campos que não foram alterados).
- **FR-003c**: Na tela de edição, selecionar uma nova imagem MUST ser opcional: se o administrador
  não selecionar um arquivo novo, a imagem atualmente salva no produto MUST ser preservada sem exigir
  re-upload. Uma nova imagem só substitui a atual quando o administrador explicitamente seleciona um
  arquivo novo.
- **FR-004**: A seção "Produtos em Destaque" da Home MUST buscar produtos do Firestore filtrando
  apenas aqueles com `destaque` igual a `true`, em vez de usar os dados fixos/mockados atuais.
- **FR-005**: A seção "Produtos em Destaque" da Home MUST exibir os produtos retornados em ordem
  embaralhada, recalculada a cada carregamento da página (a ordem não é fixa nem persistida entre
  carregamentos).
- **FR-006**: Quando a busca não retornar nenhum produto com `destaque = true`, a seção "Produtos em
  Destaque" MUST exibir uma mensagem de estado vazio (ex.: "Em breve") no lugar da grade/carrossel
  de produtos, mantendo o restante da Home funcional.
- **FR-007**: Produtos sem o campo `destaque` (cadastrados antes desta funcionalidade) MUST ser
  tratados como não destacados pela busca da Home, sem necessidade de migração automática de dados
  existentes.
- **FR-008**: O sistema MUST NOT impor limite de quantidade de produtos que podem estar marcados
  como destaque simultaneamente.
- **FR-009**: A funcionalidade MUST reaproveitar a estrutura de serviços já existente
  (`frontend/src/services`, `frontend/src/firebase`) e MUST NOT quebrar o fluxo de cadastro de
  produto já funcional hoje (campos e comportamento atuais do formulário permanecem intactos, além
  do novo checkbox).

### Key Entities

- **Product** (`products` no Firestore): ganha um novo campo `destaque` (booleano). Os demais campos
  já existentes (nome, categoria, preço, estoque, descrição, imagem) não são alterados por esta
  funcionalidade.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um administrador consegue cadastrar um produto já marcado como destaque, e esse
  produto aparece na Home em até um recarregamento da página (sem passos manuais adicionais além do
  cadastro em si).
- **SC-002**: 100% dos produtos exibidos em "Produtos em Destaque" na Home têm `destaque = true` no
  Firestore no momento da consulta — zero produtos fora desse critério aparecem na seção.
- **SC-003**: Em pelo menos 2 recarregamentos consecutivos da Home com 3 ou mais produtos em
  destaque, a ordem de exibição não é idêntica em 100% das vezes (evidenciando que o embaralhamento
  está de fato ocorrendo).
- **SC-004**: Quando não há nenhum produto em destaque, 100% dos carregamentos da Home mostram a
  mensagem de estado vazio em vez de uma seção quebrada, vazia sem explicação, ou com erro visível.
- **SC-005**: O fluxo de cadastro de produto existente continua funcionando sem regressão após a
  mudança (mesmos campos anteriores continuam salvando corretamente, mais o novo campo `destaque`).
- **SC-006**: Um administrador consegue localizar qualquer produto já cadastrado na listagem do
  Admin, abrir sua edição, alterar qualquer campo (incluindo destaque) e confirmar que o Firestore
  reflete exatamente as mudanças feitas, sem perder ou duplicar dados do produto.

## Assumptions

- A busca da Home por produtos em destaque é feita uma vez por carregamento de página (não é uma
  assinatura em tempo real) — coerente com "embaralhar a cada carregamento da página" do pedido
  original; mudanças feitas pelo admin refletem na Home no próximo carregamento, não instantaneamente
  enquanto a página já está aberta.
- Não há um teto de exibição para "Produtos em Destaque" — todos os produtos com `destaque = true`
  são candidatos a aparecer (a apresentação em carrossel/grid já existente na Home comporta qualquer
  quantidade).
- O controle de acesso à página `/admin` (quem pode ou não cadastrar/editar produtos) é uma
  preocupação pré-existente do projeto, fora do escopo desta funcionalidade.
- O rótulo de estado vazio será "Em breve" (sugestão do pedido original); o texto exato pode ser
  ajustado na implementação sem mudar o comportamento descrito nos requisitos.
- A listagem de produtos no Admin (FR-003) é uma tela nova, criada por esta funcionalidade — não
  existe hoje. Seu escopo visual/UX fica a critério da implementação (ex.: tabela simples), desde
  que permita identificar e selecionar um produto para editar.
- Exclusão de produtos não faz parte desta funcionalidade — apenas cadastro (já existente) e edição
  (nova).
