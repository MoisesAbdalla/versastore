# Feature Specification: Dashboard Administrativa do E-commerce

**Feature Branch**: `003-admin-dashboard`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Criar uma dashboard administrativa completa para o e-commerce, acessível apenas por usuários com papel de administrador, servindo como central de gestão da loja. O painel deve ser intuitivo, amigável e eficiente, inspirado nos painéis de grandes marketplaces (Mercado Livre, Shopee, Amazon Seller Central), permitindo que um lojista sem conhecimento técnico gerencie toda a operação. Módulos: Visão Geral (indicadores, gráfico de vendas, mais vendidos, pedidos recentes, alertas), Gestão de Produtos (listagem, busca/filtros, ações em massa, cadastro/edição com variações, imagens, promoção, rascunho automático, duplicar, soft delete), Categorias (CRUD com 2 níveis), Pedidos (ciclo de vida com 7 status, detalhe com histórico, rastreio, cancelamento com devolução de estoque), Clientes (listagem, detalhe, busca), Relatórios (vendas por período, produtos, exportação CSV). UX: menu lateral, responsivo, feedback visual, confirmações, estados vazios, filtros persistentes, acessível."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acesso restrito ao painel administrativo (Priority: P1)

Como dono da loja, quero que o painel administrativo seja acessível apenas por usuários com papel
de administrador, para que clientes comuns ou visitantes jamais vejam ou alterem dados de gestão
do negócio.

**Why this priority**: É o pré-requisito de segurança de todos os demais módulos — nenhuma tela de
gestão pode existir sem essa barreira. Também é o menor incremento testável de forma independente.

**Independent Test**: Pode ser testado isoladamente criando um usuário com papel de administrador e
outro sem: o primeiro acessa o painel e vê o layout de gestão (menu lateral + cabeçalho); o segundo
é redirecionado com mensagem clara, tanto navegando pela interface quanto acessando a URL do painel
diretamente. Além do redirecionamento visual, uma tentativa de leitura/escrita direta nos dados
administrativos por um usuário sem papel de administrador é rejeitada pela camada de dados.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com papel de administrador, **When** ele acessa a URL do
   painel, **Then** o painel abre com menu lateral de navegação entre módulos e cabeçalho exibindo
   o nome do usuário logado.
2. **Given** um usuário autenticado sem papel de administrador, **When** ele tenta acessar
   qualquer URL do painel, **Then** ele é redirecionado para fora do painel com uma mensagem clara
   de acesso não autorizado (em português).
3. **Given** um visitante não autenticado, **When** ele tenta acessar qualquer URL do painel,
   **Then** ele é direcionado para a tela de login.
4. **Given** um usuário sem papel de administrador que obteve a URL de uma tela interna do painel,
   **When** ele tenta ler ou gravar dados administrativos diretamente (fora da interface), **Then**
   a operação é negada pela camada de dados — a proteção não depende apenas da navegação do
   cliente.
5. **Given** o modelo de permissões, **When** um novo papel (ex.: "operador") for introduzido no
   futuro, **Then** as permissões podem ser atribuídas por funcionalidade sem reescrever o controle
   de acesso existente (permissões organizadas por capacidade, não codificadas por tela).

---

### User Story 2 - Gestão completa de produtos (Priority: P2)

Como lojista, quero listar, buscar, cadastrar, editar, duplicar e excluir produtos — incluindo
variações, múltiplas imagens, promoções e controle de estoque — para manter o catálogo da loja
atualizado com agilidade e sem risco de perder trabalho.

**Why this priority**: O catálogo é o coração da operação: sem produtos bem cadastrados nenhum
outro módulo (pedidos, relatórios, visão geral) tem dados úteis. É o módulo de maior uso diário do
lojista.

**Independent Test**: Pode ser testado isoladamente acessando o módulo de produtos, cadastrando um
produto completo (com imagens, variações e promoção), verificando-o na listagem com busca/filtros,
editando-o, duplicando-o e excluindo-o — sem depender de pedidos, clientes ou relatórios.

**Acceptance Scenarios**:

1. **Given** o lojista está no módulo de produtos, **When** a listagem carrega, **Then** exibe
   tabela paginada com imagem principal, nome, SKU, categoria, preço, estoque, status (ativo,
   inativo, rascunho) e data de criação de cada produto.
2. **Given** a listagem de produtos, **When** o lojista busca por nome ou SKU, filtra por
   categoria, status ou faixa de estoque, ou ordena por uma coluna, **Then** a tabela reflete a
   busca/filtro/ordenação e a paginação continua funcionando.
3. **Given** o lojista seleciona vários produtos na listagem, **When** aplica uma ação em massa
   (ativar/desativar, alterar categoria ou excluir), **Then** uma confirmação explícita é exigida
   antes da execução e, ao confirmar, todos os selecionados são atualizados.
4. **Given** o formulário de cadastro organizado por seções (informações básicas, imagens, preço e
   promoção, estoque, variações, status), **When** o lojista preenche e salva, **Then** o produto é
   criado com todos os dados informados, incluindo descrição com formatação, marca e tags.
5. **Given** o formulário de produto, **When** o lojista envia múltiplas imagens (inclusive por
   arrastar-e-soltar), reordena e define a imagem principal, **Then** as imagens são validadas
   (formato e tamanho), salvas na ordem definida e a principal é a exibida na listagem.
6. **Given** uma falha no envio de uma imagem, **When** o erro ocorre, **Then** o formulário
   permanece utilizável, o erro é comunicado em português e o lojista pode tentar o envio novamente
   sem perder os demais dados preenchidos.
7. **Given** um produto com variações (ex.: tamanho e cor), **When** o lojista cadastra cada
   variação, **Then** cada uma tem seu próprio SKU, estoque próprio e preço opcional (herda o preço
   do produto quando não informado).
8. **Given** o cadastro de preço promocional, **When** a data de fim é anterior à de início,
   **Then** o salvamento é bloqueado com mensagem clara.
9. **Given** um SKU já existente no catálogo, **When** o lojista tenta salvar outro produto ou
   variação com o mesmo SKU, **Then** o sistema impede e aponta a duplicidade.
10. **Given** um produto sem nome, preço, ao menos uma imagem ou estoque definido, **When** o
    lojista tenta publicá-lo (status ativo), **Then** a publicação é bloqueada com mensagens de
    validação em português indicando o que falta; salvar como rascunho continua permitido.
11. **Given** o lojista está preenchendo o formulário, **When** ele sai ou a página é recarregada
    antes de salvar, **Then** o trabalho em andamento é recuperado automaticamente (rascunho
    automático) ao retornar ao formulário.
12. **Given** um produto existente, **When** o lojista usa a ação "duplicar", **Then** um novo
    produto é criado pré-preenchido com os dados do original (com SKU exigindo alteração para não
    duplicar), em status rascunho.
13. **Given** um produto que já possui pedidos associados, **When** o lojista o exclui, **Then** a
    exclusão é lógica (o produto some das listagens e da loja, mas o histórico de pedidos permanece
    íntegro); produtos sem pedidos podem ser excluídos definitivamente.
14. **Given** filtros, busca e página aplicados na listagem, **When** o lojista abre o detalhe de
    um produto e volta, **Then** a listagem retorna exatamente com os mesmos filtros, busca e
    página.

---

### User Story 3 - Gestão de categorias com subcategorias (Priority: P3)

Como lojista, quero criar, editar e excluir categorias e subcategorias (2 níveis), para organizar o
catálogo de forma navegável para os clientes da loja.

**Why this priority**: Produtos dependem de categorias para organização e filtros; vem logo após a
gestão de produtos por ser estrutural para o catálogo, mas com volume de uso menor.

**Independent Test**: Pode ser testado isoladamente criando uma categoria com subcategoria,
editando nome/slug/descrição/imagem, tentando excluir uma categoria com produtos (deve ser
bloqueado com oferta de mover os produtos) e excluindo uma categoria vazia.

**Acceptance Scenarios**:

1. **Given** o módulo de categorias, **When** o lojista cria uma categoria com nome, slug,
   descrição opcional e imagem opcional, **Then** ela aparece na listagem e fica disponível para
   associação em produtos.
2. **Given** uma categoria existente, **When** o lojista cria uma subcategoria vinculada a ela,
   **Then** a hierarquia de 2 níveis é exibida na listagem e a subcategoria fica disponível nos
   produtos.
3. **Given** uma categoria que possui produtos associados, **When** o lojista tenta excluí-la,
   **Then** a exclusão é bloqueada e o sistema oferece mover os produtos para outra categoria antes
   de concluir.
4. **Given** uma categoria sem produtos, **When** o lojista a exclui (com confirmação explícita),
   **Then** ela é removida e deixa de aparecer em filtros e formulários.

---

### User Story 4 - Gestão de pedidos com ciclo de vida controlado (Priority: P4)

Como lojista, quero acompanhar e operar os pedidos da loja — avançar status, registrar rastreio,
cancelar com motivo — com histórico completo de quem alterou o quê e quando, para atender os
clientes com confiabilidade.

**Why this priority**: É o módulo operacional mais crítico depois do catálogo; depende de haver
pedidos na base (gerados pela loja), por isso vem após produtos/categorias.

**Independent Test**: Pode ser testado isoladamente com pedidos existentes na base: listar com
filtros e busca, abrir o detalhe, avançar status válido, tentar transição inválida (bloqueada),
cancelar com motivo (estoque devolvido) e registrar código de rastreio.

**Acceptance Scenarios**:

1. **Given** o módulo de pedidos, **When** a listagem carrega, **Then** exibe número do pedido,
   cliente, data, quantidade de itens, valor total, forma de pagamento e status, com filtros por
   status, período e cliente, e busca por número do pedido ou nome do cliente.
2. **Given** o detalhe de um pedido, **When** aberto, **Then** exibe dados do cliente, endereço de
   entrega, itens com os preços praticados no momento da compra, histórico de mudanças de status
   (com data/hora e autor), campo de código de rastreio e notas internas.
3. **Given** um pedido em um status do ciclo (aguardando pagamento → pago → em separação → enviado
   → entregue; cancelado; devolvido), **When** o lojista avança o status seguindo a sequência
   válida, **Then** o novo status é gravado com registro no histórico (autor e data/hora).
4. **Given** um pedido que nunca foi "enviado", **When** o lojista tenta marcá-lo como "entregue",
   **Then** a transição é bloqueada com mensagem explicando a sequência exigida.
5. **Given** um pedido ativo, **When** o lojista o cancela, **Then** um motivo é obrigatório, a
   confirmação explícita é exigida, os itens retornam ao estoque automaticamente e o histórico
   registra o cancelamento.
6. **Given** um produto que teve o preço alterado após a compra, **When** o lojista consulta um
   pedido antigo contendo esse produto, **Then** o pedido exibe o preço vigente no momento da
   compra, não o preço atual.
7. **Given** filtros e página aplicados na listagem de pedidos, **When** o lojista abre um detalhe
   e volta, **Then** filtros e página são preservados.

---

### User Story 5 - Visão geral do negócio (Priority: P5)

Como lojista, quero abrir o painel e ver imediatamente a saúde do negócio — faturamento, pedidos,
ticket médio, produtos vendidos, gráfico de vendas, mais vendidos, pedidos recentes e alertas —
para decidir onde agir sem precisar navegar por módulos.

**Why this priority**: É a tela de maior valor percebido, mas consome dados produzidos pelos
módulos anteriores (produtos e pedidos); sem eles, exibiria apenas estados vazios.

**Independent Test**: Pode ser testado isoladamente com uma base contendo pedidos e produtos:
conferir os cards de indicadores e suas comparações percentuais, trocar o período do gráfico,
verificar os 5 mais vendidos, os pedidos recentes com atalho para o detalhe e os alertas
acionáveis.

**Acceptance Scenarios**:

1. **Given** a tela de visão geral, **When** ela carrega, **Then** exibe cards de faturamento
   (hoje, últimos 7 dias, mês atual), número de pedidos, ticket médio e produtos vendidos, cada um
   com comparação percentual contra o período anterior equivalente (ex.: "+12% vs. mês passado").
2. **Given** o gráfico de vendas ao longo do tempo, **When** o lojista troca o período (7 dias, 30
   dias, 90 dias, 12 meses ou personalizado), **Then** o gráfico é atualizado para o período
   escolhido.
3. **Given** o período selecionado, **When** a visão geral carrega, **Then** exibe a lista dos 5
   produtos mais vendidos nesse período.
4. **Given** a lista de pedidos mais recentes, **When** o lojista clica em um pedido, **Then** é
   levado direto ao detalhe daquele pedido.
5. **Given** produtos com estoque baixo/zerado, pedidos pagos aguardando envio ou produtos sem foto
   ou com descrição incompleta, **When** a visão geral carrega, **Then** cada situação aparece como
   alerta acionável com atalho para a tela onde o lojista resolve o problema.
6. **Given** qualquer valor monetário ou data exibidos no painel, **When** renderizados, **Then**
   valores aparecem em Real (R$) e datas no formato brasileiro (dd/mm/aaaa).

---

### User Story 6 - Consulta de clientes (Priority: P6)

Como lojista, quero consultar meus clientes, com total de pedidos e total gasto, e abrir o
histórico completo de cada um, para dar suporte e conhecer meus melhores compradores.

**Why this priority**: Consulta de apoio — valiosa, mas menos frequente que operação de pedidos e
catálogo; depende dos dados de pedidos.

**Independent Test**: Pode ser testado isoladamente com clientes e pedidos na base: listar clientes
com totais, buscar por nome ou e-mail e abrir o detalhe com histórico de pedidos e endereços.

**Acceptance Scenarios**:

1. **Given** o módulo de clientes, **When** a listagem carrega, **Then** exibe nome, e-mail, data
   de cadastro, total de pedidos e total gasto de cada cliente, com busca por nome ou e-mail.
2. **Given** um cliente da lista, **When** o lojista abre seu detalhe, **Then** vê o histórico
   completo de pedidos (com atalho para cada um) e os endereços do cliente.

---

### User Story 7 - Relatórios e exportação CSV (Priority: P7)

Como lojista, quero relatórios de vendas e de produtos por período, e exportar qualquer listagem em
CSV, para analisar o negócio fora do sistema (planilhas, contador).

**Why this priority**: Consome dados de todos os módulos anteriores; é análise, não operação — por
isso fecha a sequência.

**Independent Test**: Pode ser testado isoladamente com dados na base: gerar relatório de vendas
agrupado por dia/semana/mês, relatório de produtos (mais vendidos, sem vendas, estoque atual) e
exportar uma listagem filtrada em CSV, conferindo que o arquivo reflete exatamente os filtros
aplicados.

**Acceptance Scenarios**:

1. **Given** o módulo de relatórios, **When** o lojista escolhe um período e um agrupamento (dia,
   semana ou mês), **Then** o relatório de vendas exibe os totais agrupados conforme escolhido.
2. **Given** o relatório de produtos, **When** gerado para um período, **Then** exibe mais
   vendidos, produtos sem vendas no período e estoque atual.
3. **Given** qualquer listagem do painel (produtos, pedidos, clientes, relatórios) com filtros
   aplicados, **When** o lojista aciona a exportação, **Then** um arquivo CSV é baixado contendo
   exatamente os dados filtrados exibidos, com cabeçalhos em português.

---

### Edge Cases

- Dois compradores tentam comprar a última unidade de um produto simultaneamente: apenas um pedido
  pode consumir a unidade; o estoque nunca fica negativo e o segundo comprador recebe indicação de
  indisponibilidade.
- Pedido cancelado devolve os itens ao estoque automaticamente, na mesma operação da mudança de
  status — nunca um sem o outro (sem estado intermediário em caso de falha).
- Alterar preço, nome ou imagem de um produto não altera pedidos já realizados (itens do pedido são
  um retrato do momento da compra).
- Datas de promoção inválidas (fim antes do início) são bloqueadas no salvamento.
- Falha no upload de imagem não trava o formulário: erro claro, demais campos preservados e opção
  de tentar novamente.
- Exclusão de produto com pedidos associados é sempre lógica; as listagens e a loja deixam de
  exibi-lo, mas pedidos antigos continuam íntegros.
- Categoria com produtos não pode ser excluída sem antes mover os produtos.
- Transições de status de pedido fora da sequência válida são bloqueadas (ex.: "entregue" sem
  "enviado"; avançar status de pedido "cancelado").
- Listagens vazias (nenhum produto, pedido ou cliente) exibem estado vazio orientando o próximo
  passo (ex.: "Cadastre seu primeiro produto"), nunca tela quebrada ou tabela em branco sem
  explicação.
- Falha de conexão ao carregar qualquer módulo exibe mensagem amigável em português com opção de
  tentar novamente, sem travar o painel.
- Perda de trabalho no formulário de produto (fechar aba, recarregar) é mitigada pelo rascunho
  automático.
- Usuário com papel de administrador revogado durante uma sessão ativa perde acesso ao painel nas
  próximas operações (a revogação não depende de novo login para valer na camada de dados).

## Requirements *(mandatory)*

### Functional Requirements

**Acesso e permissões**

- **FR-001**: O sistema MUST restringir todas as telas e dados do painel administrativo a usuários
  autenticados com papel de administrador; usuários sem o papel são redirecionados com mensagem
  clara e visitantes não autenticados são enviados ao login.
- **FR-002**: A proteção de acesso MUST existir também na camada de dados (regras de acesso às
  coleções administrativas), não apenas na navegação do cliente.
- **FR-003**: O modelo de permissões MUST ser organizado por funcionalidade/capacidade, permitindo
  a futura introdução de papéis adicionais (ex.: "operador") sem reescrita do controle de acesso.

**Visão geral**

- **FR-010**: A visão geral MUST exibir cards de faturamento (hoje, últimos 7 dias, mês atual),
  número de pedidos, ticket médio e produtos vendidos, cada um com variação percentual contra o
  período anterior equivalente.
- **FR-011**: A visão geral MUST exibir um gráfico de vendas ao longo do tempo com filtros de
  período: 7 dias, 30 dias, 90 dias, 12 meses e intervalo personalizado.
- **FR-012**: A visão geral MUST listar os 5 produtos mais vendidos no período selecionado.
- **FR-013**: A visão geral MUST listar os pedidos mais recentes com status, valor e atalho para o
  detalhe do pedido.
- **FR-014**: A visão geral MUST exibir alertas acionáveis para: produtos com estoque baixo ou
  zerado, pedidos pagos aguardando envio e produtos sem foto ou com descrição incompleta — cada
  alerta com atalho para a tela de resolução.
- **FR-015**: Os indicadores da visão geral MUST ser calculados a partir de resumos mantidos
  incrementalmente a cada pedido, de modo que o carregamento não exija varrer todos os pedidos da
  base.

**Produtos**

- **FR-020**: O módulo de produtos MUST listar produtos em tabela paginada com imagem principal,
  nome, SKU, categoria, preço, estoque, status e data de criação.
- **FR-021**: A listagem MUST oferecer busca por nome ou SKU, filtros por categoria, status e faixa
  de estoque, e ordenação por coluna.
- **FR-022**: A listagem MUST oferecer ações em massa (ativar/desativar, alterar categoria,
  excluir) com confirmação explícita antes da execução.
- **FR-023**: O formulário de produto MUST ser organizado em seções: informações básicas (nome,
  descrição com formatação, categoria, marca, tags), imagens, preço e promoção, estoque, variações
  e status.
- **FR-024**: O upload de imagens MUST aceitar múltiplas imagens com arrastar-e-soltar, permitir
  reordenação e definição da imagem principal, e validar formato e tamanho antes do envio.
- **FR-025**: Falhas de upload MUST NOT travar o formulário: o erro é comunicado, os dados
  preenchidos são preservados e o reenvio é permitido.
- **FR-026**: O produto MUST suportar preço promocional com data de início e fim; períodos
  inválidos (fim antes do início) MUST ser bloqueados.
- **FR-027**: Cada produto e cada variação MUST ter SKU único; duplicidade MUST ser bloqueada no
  salvamento com indicação do conflito.
- **FR-028**: O produto MUST suportar variações (ex.: tamanho, cor), cada uma com SKU próprio,
  estoque próprio e preço opcional.
- **FR-029**: O produto MUST ter status ativo (visível na loja), inativo (oculto) ou rascunho
  (incompleto); publicação (ativo) MUST ser bloqueada sem nome, preço, ao menos uma imagem e
  estoque definido.
- **FR-030**: O formulário MUST salvar rascunho automaticamente, recuperando o trabalho em caso de
  saída ou recarregamento antes do salvamento.
- **FR-031**: O produto MUST ter alerta de estoque baixo configurável individualmente (limite por
  produto).
- **FR-032**: O sistema MUST oferecer ação de duplicar produto, criando cópia em rascunho com SKU a
  ser redefinido.
- **FR-033**: Exclusão de produto com pedidos associados MUST ser lógica (marcação de excluído, sem
  remoção física); todas as listagens do painel e a loja MUST filtrar produtos excluídos. Produtos
  sem pedidos podem ser excluídos definitivamente.

**Categorias**

- **FR-040**: O sistema MUST permitir criar, editar e excluir categorias com nome, slug, descrição
  opcional e imagem opcional.
- **FR-041**: Categorias MUST suportar hierarquia de 2 níveis (categoria e subcategoria).
- **FR-042**: Exclusão de categoria com produtos associados MUST ser bloqueada, oferecendo mover os
  produtos para outra categoria antes de concluir.

**Pedidos**

- **FR-050**: A listagem de pedidos MUST exibir número do pedido, cliente, data, quantidade de
  itens, valor total, forma de pagamento e status, com filtros por status, período e cliente, e
  busca por número do pedido ou nome do cliente.
- **FR-051**: O ciclo de vida do pedido MUST seguir os status: aguardando pagamento, pago, em
  separação, enviado, entregue, cancelado, devolvido; transições fora da sequência válida MUST ser
  bloqueadas.
- **FR-052**: O detalhe do pedido MUST exibir dados do cliente, endereço de entrega, itens com
  preços do momento da compra, histórico de mudanças de status (data/hora e autor), código de
  rastreio e notas internas.
- **FR-053**: Os itens do pedido MUST ser um retrato do momento da compra (nome, preço, variação):
  alterações posteriores no produto MUST NOT afetar pedidos existentes.
- **FR-054**: Cancelamento de pedido MUST exigir motivo obrigatório e confirmação explícita, e MUST
  devolver os itens ao estoque na mesma operação da mudança de status (tudo ou nada).
- **FR-055**: Toda mudança de status MUST ser registrada no histórico do pedido com data/hora e
  autor da alteração.
- **FR-056**: A baixa de estoque na criação do pedido e a devolução no cancelamento MUST ser
  atômicas, garantindo que o estoque nunca fique negativo mesmo com compras simultâneas da última
  unidade.

**Clientes**

- **FR-060**: A listagem de clientes MUST exibir nome, e-mail, data de cadastro, total de pedidos e
  total gasto, com busca por nome ou e-mail.
- **FR-061**: O detalhe do cliente MUST exibir o histórico completo de pedidos (com atalho para
  cada pedido) e os endereços cadastrados.

**Relatórios e exportação**

- **FR-070**: O sistema MUST gerar relatório de vendas por período com agrupamento por dia, semana
  ou mês.
- **FR-071**: O sistema MUST gerar relatório de produtos: mais vendidos, sem vendas no período e
  estoque atual.
- **FR-072**: Qualquer listagem do painel (produtos, pedidos, clientes, relatórios) MUST poder ser
  exportada em CSV contendo exatamente os dados filtrados exibidos, com cabeçalhos em português;
  a geração ocorre no próprio painel, sem serviços adicionais.

**Experiência (transversal)**

- **FR-080**: O painel MUST ter menu lateral fixo de navegação entre módulos, cabeçalho com nome do
  usuário logado e busca global cobrindo produtos e pedidos.
- **FR-081**: O painel MUST ser totalmente responsivo, com todos os fluxos principais utilizáveis
  em tela de celular.
- **FR-082**: Toda ação MUST ter feedback visual: carregamento (skeletons nas tabelas),
  confirmação de sucesso (toasts) e mensagens de erro amigáveis em português.
- **FR-083**: Toda ação destrutiva (excluir, cancelar) MUST exigir confirmação explícita.
- **FR-084**: Listagens vazias MUST exibir estado vazio orientando o próximo passo.
- **FR-085**: Filtros, busca e página das listagens MUST ser preservados ao navegar para um detalhe
  e voltar (estado refletido na URL, permitindo também compartilhar a visão filtrada).
- **FR-086**: O painel MUST ser acessível por teclado e com contraste adequado.
- **FR-087**: Valores monetários MUST ser exibidos em Real (R$) e datas no formato brasileiro
  (dd/mm/aaaa) em todo o painel.
- **FR-088**: Listagens MUST usar paginação eficiente que não degrade com o crescimento da base
  (avanço por cursor/página, sem carregar a coleção inteira).

### Key Entities

- **Produto**: item do catálogo com nome, descrição formatada, categoria, marca, tags, imagens
  ordenadas (uma principal), preço, preço promocional com vigência, estoque, limite de alerta de
  estoque baixo, SKU único, status (ativo/inativo/rascunho), marcação de exclusão lógica e data de
  criação. Pode ter **variações** (ex.: tamanho/cor), cada uma com SKU próprio, estoque próprio e
  preço opcional.
- **Categoria**: nome, slug, descrição opcional, imagem opcional; hierarquia de 2 níveis
  (categoria pai → subcategoria). Relaciona-se com produtos; não pode ser excluída enquanto tiver
  produtos.
- **Pedido**: número, cliente, data, forma de pagamento, status do ciclo de vida, valor total,
  endereço de entrega, código de rastreio, notas internas e **itens do pedido** — cópia
  desnormalizada de nome, variação, preço unitário do momento da compra e quantidade (nunca
  referência viva ao produto). Possui **histórico de status** (status, data/hora, autor, motivo
  quando cancelamento).
- **Cliente**: nome, e-mail, data de cadastro, endereços; agregados de total de pedidos e total
  gasto para exibição em listagem.
- **Usuário administrativo / Papel**: usuário autenticado com papel (inicialmente
  "administrador"), com permissões organizadas por funcionalidade para acomodar papéis futuros.
- **Resumo de vendas (agregado)**: totais incrementais por dia (faturamento, número de pedidos,
  unidades vendidas, unidades por produto) mantidos a cada pedido, alimentando visão geral,
  gráfico e relatórios sem varredura completa de pedidos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um lojista consegue cadastrar um produto completo (com imagens e variações) em menos
  de 3 minutos.
- **SC-002**: Um administrador localiza qualquer pedido em menos de 10 segundos usando busca ou
  filtros.
- **SC-003**: A visão geral exibe os indicadores principais em menos de 2 segundos após abrir a
  tela, independentemente do total de pedidos históricos na base.
- **SC-004**: 100% dos fluxos principais (visão geral, listar/cadastrar/editar produto, operar
  pedido, consultar cliente, exportar CSV) são utilizáveis em tela de celular.
- **SC-005**: 100% das tentativas de acesso ao painel por usuários sem papel de administrador são
  bloqueadas — tanto na navegação quanto na camada de dados.
- **SC-006**: Zero ocorrências de estoque negativo, mesmo sob compras simultâneas da última
  unidade de um produto.
- **SC-007**: 100% dos pedidos preservam os preços do momento da compra após qualquer alteração
  posterior nos produtos.
- **SC-008**: 100% das mudanças de status de pedido ficam registradas no histórico com data/hora e
  autor.
- **SC-009**: Um cancelamento de pedido nunca resulta em estado parcial: estoque devolvido sem
  status alterado (ou vice-versa) não ocorre em nenhuma circunstância.
- **SC-010**: Exportações CSV refletem exatamente os filtros aplicados na tela em 100% dos casos.

## Assumptions

- O papel de administrador do primeiro usuário é atribuído manualmente na base de dados (fora da
  interface); gestão de papéis pela interface fica para fase futura — o modelo de permissões apenas
  precisa comportá-la.
- A loja (vitrine) ainda não possui checkout completo; o painel gerencia os pedidos existentes na
  base, e a criação de pedidos pela loja é dependência externa a esta feature. Para validação,
  pedidos podem ser criados com dados de exemplo respeitando o modelo definido (incluindo baixa de
  estoque e itens desnormalizados).
- "Descrição rica" significa formatação básica (negrito, itálico, listas); edição avançada de
  layout está fora do escopo.
- "Tempo real" na visão geral significa dados atualizados a cada carregamento da tela, não
  streaming contínuo.
- Limites de upload de imagem: formatos JPG, PNG e WebP, tamanho máximo de 5 MB por imagem (valores
  ajustáveis na implementação sem mudar o comportamento especificado).
- O fuso horário de referência para datas, agregados diários e relatórios é o do lojista (horário
  de Brasília).
- O rascunho automático protege o trabalho no dispositivo/navegador em uso; recuperação entre
  dispositivos diferentes não é exigida nesta fase.
- Fora de escopo nesta fase: gestão de fretes/integrações com transportadoras, cupons de desconto,
  multi-loja, e-mails transacionais e integração com meios de pagamento reais.
- As páginas existentes da loja (home e demais) permanecem intactas — mesmo visual, mesmas rotas.
