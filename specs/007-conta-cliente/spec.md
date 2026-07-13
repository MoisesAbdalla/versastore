# Feature Specification: Conta do Cliente (Autenticação, Cadastro, Pedidos e Endereços)

**Feature Branch**: `007-conta-cliente`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Conta do cliente (M3): redesign definitivo de /login e /register no padrão do site, cadastro completo (nome, e-mail validado, senha+confirmação com força, telefone, CPF, aceite de termos/LGPD, validação campo a campo), recuperação de senha, área 'meus pedidos', e endereços com busca por CEP (ViaCEP). Corrige a raiz do bug de pedidos sem nome do cliente. CPF e login com Google a decidir na clarificação."

## Contexto

M3 do roadmap de lançamento. Hoje `/login` e `/register` são telas cruas de teste (inputs sem
estilo, `alert()` genérico de erro); o registro pede só e-mail e senha uma vez; não existe
recuperação de senha; o cliente não tem onde ver seus pedidos nem gerenciar endereços; e contas
nascem **sem nome** — raiz do bug em que pedidos aparecem sem nome do cliente no painel admin
(feature 003) e que exigiu um backfill. Este módulo entrega a **área de conta do cliente** e as
**telas de autenticação definitivas**, preparando o endereço de entrega e a identidade do cliente
para o checkout (M4) e o consentimento LGPD para a conformidade (M8).

A escrita nova é sempre no **próprio documento do usuário** (`users/{uid}`), já permitida pelas
security rules (o usuário edita o próprio doc, exceto `role`/`orderCount`/`totalSpent`). O painel
admin já lê `users` (feature 003) — o cadastro grava no formato que ele espera.

### Decisões resolvidas na clarificação (2026-07-13)

- **CPF**: fora do cadastro do M3 — só no checkout (M4).
- **Login com Google**: incluído agora, com passo "Complete seu cadastro" na primeira entrada para
  telefone + aceite de termos. Ver Clarifications.

## Clarifications

### Session 2026-07-13

- Q: O CPF deve ser obrigatório no cadastro, ou coletado só no checkout? → A: **Fora do cadastro no
  M3** — o CPF não aparece no formulário de cadastro; será coletado apenas no checkout (M4).
- Q: Login com Google entra agora ou na Fase C? E como coletar telefone/termos de quem entra por
  Google (não passa pelo formulário)? → A: **Google entra agora**. Na **primeira entrada via
  Google**, um passo **"Complete seu cadastro"** coleta **telefone** e o **aceite de termos/
  privacidade** (paridade com o cadastro por e-mail; o aceite LGPD não pode ser adiado). Enquanto
  incompleto, a conta é marcada e re-solicitada. **Telefone e aceite são obrigatórios nos dois
  fluxos.**

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Telas de autenticação definitivas com validação campo a campo (Priority: P1)

Como visitante, quero telas de login e cadastro bonitas, no padrão da loja, que me digam
exatamente o que corrigir em cada campo, para confiar na loja e conseguir criar minha conta sem
frustração.

**Why this priority**: As telas atuais parecem protótipo e usam `alert()` — corroem a confiança
logo na porta de entrada da conta. É a base visual e de UX sobre a qual as demais histórias se
apoiam, e independentemente testável.

**Independent Test**: Abrir `/login` e `/register`, ver o layout no padrão do site sob o
`MainLayout`, submeter com campos inválidos e conferir que cada campo mostra sua própria mensagem
em pt-BR (nunca um `alert` genérico), inclusive em viewport de 375px.

**Acceptance Scenarios**:

1. **Given** um visitante em `/login` ou `/register`, **When** a tela carrega, **Then** o visual
   segue o design system (tokens de `variables.css`, tipografia, botões e inputs consistentes com a
   Home e a vitrine), sob o `MainLayout` (header/navbar/footer).
2. **Given** um formulário com um campo inválido (ex.: e-mail malformado), **When** o visitante
   submete ou sai do campo, **Then** a mensagem de erro aparece **naquele campo**, em português,
   sem `alert`.
3. **Given** a tela em viewport de 375px, **When** o visitante interage, **Then** o formulário é
   utilizável sem scroll horizontal.
4. **Given** as telas de login e cadastro, **When** o visitante quer alternar, **Then** há um link
   claro entre elas ("Não tem conta? Cadastre-se" / "Já tem conta? Entrar") e um link para
   "Esqueci minha senha" no login.

---

### User Story 2 - Cadastro completo criando o cliente corretamente (Priority: P1)

Como novo cliente, quero me cadastrar informando nome, e-mail, senha, telefone e aceitando os
termos, para ter uma conta completa — e o lojista quer que meu nome seja gravado corretamente para
me encontrar e me atender.

**Why this priority**: Corrige a **raiz** do bug de pedidos/clientes sem nome (o backfill da 003 foi
paliativo) e cria a identidade que o checkout (M4) e o admin usam. É o coração do M3.

**Independent Test**: Cadastrar um cliente novo preenchendo todos os campos obrigatórios e aceitando
os termos, e verificar no Firestore que `users/{uid}` foi criado com `role: "customer"`, `name`,
`nameLower`, `email`, telefone, `addresses: []`, `orderCount: 0`, `totalSpent: 0`, `createdAt`; e
que o `displayName` do Auth recebeu o nome.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro, **When** o cliente preenche nome completo, e-mail, senha,
   confirmação de senha e telefone e aceita os termos, **Then** a conta é criada e o documento
   `users/{uid}` é gravado no formato esperado pelo admin (com `role: "customer"`, `name`,
   `nameLower`, `email`, telefone, `addresses`, agregados zerados, `createdAt`), e o `displayName`
   do Auth recebe o nome.
2. **Given** o campo de senha, **When** o cliente digita, **Then** um indicador de força é exibido e
   as regras da senha são mostradas claramente; senha fraca/curta é rejeitada com mensagem.
3. **Given** senha e confirmação diferentes, **When** o cliente submete, **Then** o campo de
   confirmação sinaliza a divergência.
4. **Given** os termos de uso e a política de privacidade não aceitos, **When** o cliente tenta
   cadastrar, **Then** o cadastro é bloqueado e o aceite é sinalizado como obrigatório (LGPD).
5. **Given** um e-mail já cadastrado, **When** o cliente tenta cadastrar, **Then** vê uma mensagem
   clara de e-mail em uso (tratamento do provedor de autenticação), sem `alert`.
6. **Given** o nome informado, **When** a conta é criada, **Then** o nome fica imediatamente
   pesquisável no painel admin (o pedido futuro desse cliente já nasce com o nome).
7. **Given** o botão "Entrar com Google" no login ou cadastro, **When** um cliente novo entra pela
   primeira vez com o Google, **Then** a conta é criada com nome/e-mail do perfil Google e ele é
   levado ao passo "Complete seu cadastro" para informar telefone e aceitar os termos.
8. **Given** um cliente que entrou por Google e **não** completou o cadastro, **When** ele acessa a
   área de conta ou o checkout, **Then** é re-solicitado a completar telefone e aceite antes de
   prosseguir.

---

### User Story 3 - Recuperação de senha (Priority: P2)

Como cliente que esqueceu a senha, quero pedir a redefinição por e-mail, para recuperar o acesso à
minha conta sem depender de suporte.

**Why this priority**: Bloqueador real — hoje quem esquece a senha não tem saída. Depende das telas
de auth (US1) existirem, por isso vem depois.

**Independent Test**: Na tela de login, acionar "esqueci minha senha", informar um e-mail e conferir
o feedback claro de "e-mail de redefinição enviado", incluindo o tratamento de e-mail inexistente
sem revelar se a conta existe.

**Acceptance Scenarios**:

1. **Given** a tela de login, **When** o cliente aciona "esqueci minha senha" e informa o e-mail,
   **Then** um e-mail de redefinição é enviado e a tela mostra confirmação clara.
2. **Given** um e-mail não cadastrado, **When** o cliente solicita a redefinição, **Then** a
   resposta **não revela** se a conta existe (mensagem neutra), sem vazar existência.
3. **Given** o fluxo de redefinição, **When** o e-mail não pôde ser enviado (erro), **Then** o
   cliente vê uma mensagem amigável com opção de tentar novamente.

---

### User Story 4 - Meus pedidos (Priority: P2)

Como cliente autenticado, quero ver o histórico dos meus pedidos e o detalhe de cada um, para
acompanhar minhas compras.

**Why this priority**: Valor de acompanhamento pós-compra; depende de haver conta (US1/US2) e de
pedidos na base. As rules já permitem o cliente ler os próprios pedidos.

**Independent Test**: Logado como um cliente que tem pedidos, abrir "meus pedidos", ver a lista
(número, data, status, valor) e abrir um detalhe (itens com preço do momento, endereço, status,
rastreio quando houver); confirmar que um cliente não vê pedidos de outro.

**Acceptance Scenarios**:

1. **Given** um cliente autenticado com pedidos, **When** acessa "meus pedidos", **Then** vê a lista
   dos **próprios** pedidos com número, data, status e valor, mais recentes primeiro.
2. **Given** a lista de pedidos, **When** abre um pedido, **Then** vê os itens com o preço praticado
   no momento da compra, o endereço de entrega, o status atual e o código de rastreio quando houver.
3. **Given** um cliente sem pedidos, **When** acessa a área, **Then** vê um estado vazio orientando
   ("você ainda não fez pedidos") com atalho ao catálogo.
4. **Given** um cliente autenticado, **When** tenta acessar o pedido de outro cliente por URL
   direta, **Then** o acesso é negado (não vê dados alheios).
5. **Given** a área de pedidos, **When** os dados carregam ou falham, **Then** há estados de
   carregamento e de erro (com tentar novamente).

---

### User Story 5 - Endereços com busca por CEP (Priority: P2)

Como cliente, quero cadastrar e gerenciar meus endereços de entrega, com o CEP preenchendo o
endereço automaticamente, para agilizar a entrega e o futuro checkout.

**Why this priority**: Prepara o endereço de entrega para o checkout (M4); depende de haver conta.
A busca por CEP reduz erros e fricção.

**Independent Test**: Logado, adicionar um endereço informando o CEP (rua/bairro/cidade/UF
preenchidos automaticamente) mais número e complemento, salvar, editar, marcar como padrão e
remover; verificar que os endereços ficam no documento do próprio cliente.

**Acceptance Scenarios**:

1. **Given** a área de endereços, **When** o cliente informa um CEP válido, **Then** rua, bairro,
   cidade e UF são preenchidos automaticamente e o cliente completa número e complemento.
2. **Given** um CEP inexistente ou a consulta indisponível, **When** o cliente informa o CEP,
   **Then** vê uma mensagem clara e pode preencher o endereço manualmente (a falha do CEP não
   bloqueia o cadastro).
3. **Given** endereços cadastrados, **When** o cliente edita ou remove um, **Then** a mudança é
   salva no documento do próprio cliente e refletida na lista.
4. **Given** vários endereços, **When** o cliente marca um como **padrão**, **Then** apenas um fica
   como padrão e ele é o sugerido para entrega.
5. **Given** os endereços, **When** carregam ou falham, **Then** há estados de carregamento, vazio e
   erro.

---

### Edge Cases

- E-mail já em uso no cadastro: mensagem clara de e-mail em uso, sem `alert`, sem travar o
  formulário.
- Recuperação de senha para e-mail inexistente: resposta neutra que **não revela** se a conta
  existe (mesma mensagem do caso de sucesso).
- Conta antiga sem nome (criada antes do M3): ao logar, o cliente é convidado a completar o nome
  (ou o "meus pedidos"/checkout pede o nome faltante) — sem quebrar; o `ensureUserProfile`
  existente já cria o doc com defaults.
- CEP com a API do ViaCEP fora do ar: preenchimento manual disponível; sem bloqueio.
- Cliente tenta ver pedido de outro por URL: negado pela camada de dados (rules), sem vazar.
- Telefone/CPF com máscara: entrada tolerante (aceita com ou sem pontuação), validação clara.
- Aceite de termos não marcado: cadastro bloqueado com sinalização (obrigatório por LGPD).
- Cliente entra por Google e **abandona** o passo "Complete seu cadastro": a conta existe (criada
  pelo Google) mas fica marcada como **incompleta**; o telefone/aceite são re-solicitados no próximo
  acesso à conta ou no checkout, sem quebrar a navegação da loja.
- Sessão expira/usuário desloga enquanto navega a conta: rotas de conta exigem login (redireciona
  ao login), sem erro.

## Requirements *(mandatory)*

### Functional Requirements

**Telas de autenticação (US1)**

- **FR-001**: `/login` e `/register` MUST ser redesenhadas no padrão do design system
  (`docs/design-system.md`), sob o `MainLayout`, responsivas (≥ 375px), como telas definitivas.
- **FR-002**: A validação MUST ser **campo a campo**, com mensagens em pt-BR exibidas no próprio
  campo; `alert()` genérico MUST NOT ser usado.
- **FR-003**: As telas MUST oferecer navegação entre login e cadastro e um acesso a "esqueci minha
  senha" a partir do login.

**Cadastro completo (US2)**

- **FR-004**: O cadastro MUST coletar: nome completo (obrigatório), e-mail (validado), senha e
  confirmação de senha, telefone/WhatsApp (**obrigatório**); e o aceite obrigatório de termos de uso
  e política de privacidade. (CPF não faz parte do cadastro — FR-011.)
- **FR-005**: O campo de senha MUST exibir um indicador de força e as regras da senha; senhas que
  não atendam às regras MUST ser rejeitadas com mensagem clara.
- **FR-006**: A confirmação de senha MUST ser validada contra a senha, sinalizando divergência.
- **FR-007**: O cadastro MUST NOT prosseguir sem todos os campos obrigatórios válidos e os termos
  aceitos.
- **FR-008**: Ao cadastrar, o sistema MUST gravar o documento `users/{uid}` com `role: "customer"`,
  `name`, `nameLower` (normalizado para busca), `email`, telefone, `addresses: []`, `orderCount: 0`,
  `totalSpent: 0`, `createdAt` — consistente com o que o painel admin lê — e MUST definir o
  `displayName` da conta de autenticação com o nome.
- **FR-009**: O nome do cliente cadastrado MUST ficar imediatamente pesquisável no painel admin, e
  pedidos futuros desse cliente MUST nascer com o nome preenchido (fecha a raiz do bug da 003).
- **FR-010**: E-mail já cadastrado MUST resultar em mensagem clara de e-mail em uso (sem `alert`,
  sem travar o formulário).
- **FR-011**: O cadastro do M3 MUST NOT coletar CPF — ele fica fora do formulário de cadastro e será
  coletado apenas no checkout (M4). Nenhum campo de CPF aparece nas telas de conta desta feature.
- **FR-012**: O login com Google MUST ser oferecido no login e no cadastro, criando/atualizando o
  mesmo documento `users/{uid}` (com `role: "customer"`, nome e e-mail do perfil Google,
  `nameLower`, agregados zerados, `createdAt`) e o `displayName` do Auth.
- **FR-012a**: Como o Google não fornece telefone nem aceite de termos, a **primeira entrada via
  Google** MUST apresentar um passo **"Complete seu cadastro"** que coleta **telefone** e o **aceite
  de termos/privacidade** antes de o cliente usar a conta plenamente. Enquanto esses obrigatórios
  não forem preenchidos, a conta MUST ser marcada como **cadastro incompleto** e re-solicitada ao
  acessar a área de conta ou o checkout. Telefone e aceite são obrigatórios independentemente do
  método de entrada.

**Recuperação de senha (US3)**

- **FR-013**: O sistema MUST permitir solicitar redefinição de senha por e-mail, com confirmação
  clara de envio.
- **FR-014**: A resposta à solicitação MUST ser **neutra** para e-mail inexistente (não revela se a
  conta existe); falha de envio MUST mostrar mensagem amigável com "tentar novamente".

**Meus pedidos (US4)**

- **FR-015**: O cliente autenticado MUST ver a lista dos **próprios** pedidos (número, data, status,
  valor), mais recentes primeiro, com estados de carregamento, vazio e erro.
- **FR-016**: O cliente MUST ver o detalhe de um pedido próprio (itens com preço do momento,
  endereço de entrega, status atual, rastreio quando houver).
- **FR-017**: O sistema MUST impedir que um cliente veja pedidos de outro (inclusive por URL
  direta), apoiado nas security rules existentes.

**Endereços (US5)**

- **FR-018**: O cliente MUST poder adicionar, editar e remover endereços de entrega, guardados no
  próprio documento `users/{uid}.addresses`.
- **FR-019**: A informação de um CEP válido MUST preencher automaticamente rua, bairro, cidade e UF;
  número e complemento são manuais.
- **FR-020**: Falha ou indisponibilidade da consulta de CEP MUST NOT bloquear o cadastro — o cliente
  pode preencher manualmente, com mensagem clara.
- **FR-021**: O cliente MUST poder marcar um endereço como **padrão**; apenas um endereço fica como
  padrão por vez.

**Transversais**

- **FR-022**: As rotas de conta (meus pedidos, endereços) MUST exigir autenticação; visitante é
  direcionado ao login.
- **FR-023**: A feature MUST NOT introduzir escrita pública nova além do próprio `users/{uid}` (já
  permitido pelas rules; `role`/`orderCount`/`totalSpent` permanecem imutáveis pelo cliente).
- **FR-024**: A feature MUST reutilizar o `AuthContext` e os padrões existentes, sem quebrar Home,
  vitrine e painel admin.
- **FR-025**: Todos os textos MUST ser em pt-BR, consistentes com o design system.

### Key Entities

- **Usuário/Cliente** (`users/{uid}`): identidade única já existente (feature 003/R-15). O cadastro
  passa a preencher `name`, `nameLower`, `email`, **telefone**; mantém `role: "customer"`,
  `addresses[]`, `orderCount`, `totalSpent`, `createdAt`. Ganha o registro do **aceite de
  termos/privacidade** (marca temporal do consentimento, base para o M8). O **CPF não é coletado no
  M3** — entra no checkout (M4).
- **Endereço** (item de `users.addresses`): CEP, rua, número, complemento, bairro, cidade, UF, e
  flag de **padrão**. Mesma forma já usada em `orders.shippingAddress` (feature 003).
- **Pedido** (`orders`): leitura pelo cliente dos **próprios** pedidos (filtro por `customerId`),
  sem alteração de escrita — o cliente não edita pedidos.
- **Consentimento LGPD** (campos no usuário): aceite de termos e política com data/hora, preparando
  a conformidade do M8.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um novo cliente conclui o cadastro completo (com nome e termos) em menos de 2 minutos,
  sem encontrar um único `alert()` genérico.
- **SC-002**: 100% das contas criadas pelo novo cadastro têm `name`/`nameLower` preenchidos e o
  `displayName` do Auth definido — zero contas novas sem nome.
- **SC-003**: Um cliente recém-cadastrado é encontrável por nome no painel admin imediatamente após
  o cadastro.
- **SC-004**: 100% dos campos inválidos exibem mensagem no próprio campo (nenhuma validação cai em
  `alert`), verificado para e-mail, senha, confirmação, telefone e termos.
- **SC-005**: A solicitação de redefinição de senha nunca revela se um e-mail existe (mesma resposta
  para existente e inexistente).
- **SC-006**: Um cliente nunca vê pedidos de outro — lista e detalhe restritos aos próprios
  (verificado por teste, inclusive URL direta).
- **SC-007**: Informar um CEP válido preenche rua/bairro/cidade/UF sem digitação manual desses
  campos; um CEP inválido ou a indisponibilidade do serviço permite preenchimento manual sem
  bloquear.
- **SC-008**: As telas de login, cadastro e conta são utilizáveis em viewport de 375px sem scroll
  horizontal.
- **SC-009**: A suíte de testes existente (201) permanece verde, somada aos novos testes do M3; Home,
  vitrine e painel admin seguem sem regressão.

## Assumptions

- **CPF** (fixado na clarificação de 2026-07-13): **fora do cadastro do M3**; coletado apenas no
  checkout (M4), onde será validado por dígitos verificadores.
- **Login com Google** (fixado na clarificação de 2026-07-13): incluído no M3. Exige habilitar o
  provedor Google no console do Firebase (passo operacional do lojista). Primeira entrada via Google
  passa pelo "Complete seu cadastro" (telefone + aceite). Telefone e aceite são obrigatórios nos dois
  métodos de entrada.
- **Regras de senha**: mínimo de 8 caracteres (default do domínio); o indicador de força é
  orientativo. O provedor de autenticação (já existente) valida unicidade de e-mail e o mínimo.
- **Recuperação de senha**: usa o envio de e-mail de redefinição do provedor de autenticação já em
  uso; a customização do template do e-mail fica fora do escopo (usa o padrão).
- **Consulta de CEP**: serviço público e gratuito (ViaCEP); é uma dependência externa de **leitura**
  que, se falhar, cai para preenchimento manual — nunca bloqueia.
- **Termos e política de privacidade**: o texto legal em si é responsabilidade do M8; o M3 registra o
  **aceite** (com data/hora) e exibe links/placeholder para os documentos.
- **Contas antigas sem nome**: continuam funcionando; são convidadas a completar o nome ao logar ou
  no primeiro fluxo que precise dele (checkout/meus dados), sem migração forçada.
- **Segurança**: as rules já permitem o usuário criar/editar o próprio `users/{uid}` (exceto
  `role`/`orderCount`/`totalSpent`) e ler os próprios `orders` — nenhuma mudança de rules é
  necessária; a feature audita e reconfirma.

## Out of Scope

- Checkout e pagamento (M4) — o M3 só prepara identidade e endereço de entrega.
- Emissão de nota fiscal e o texto legal dos termos/privacidade (M8) — o M3 só registra o aceite.
- Edição de foto de perfil / avatar.
- Verificação de e-mail obrigatória (double opt-in) — pode entrar numa fase futura.
- Autenticação por telefone/SMS.
