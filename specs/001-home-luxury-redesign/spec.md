# Feature Specification: Redesenho Premium/Luxo da Home

**Feature Branch**: `001-home-luxury-redesign`

**Created**: 2026-07-10

**Status**: Draft

**Input**: User description: "Quero redesenhar a Home da Versa Store com uma estética de e-commerce de moda premium/luxo, inspirada em grandes grifes internacionais. Direção visual: paleta sóbria e elegante (preto, branco, metálico dourado/bronze); tipografia editorial com letter-spacing generoso; hero em tela cheia com imagem/vídeo de produto e texto minimalista; muito whitespace entre seções; header minimalista (logo + poucos itens de menu + ícones discretos); categorias como grid editorial com fotos grandes; produtos em destaque como carrossel/grid com fotos grandes e hover sutil; rodapé elegante com newsletter e redes sociais; micro-interações discretas; totalmente responsivo. Manter a estrutura de componentes existente em frontend/src/pages/Home sem quebrar Firebase. Logo estilizada de forma minimalista, sem emojis/ícones coloridos."

## Clarifications

### Session 2026-07-10

- Q: Header/Navbar/Footer são componentes compartilhados (via `MainLayout`) usados em todas as
  páginas do site, não só na Home. O redesenho deve se aplicar a esses componentes diretamente
  (afetando o site inteiro) ou deve ficar isolado só na Home? → A: Site inteiro — editar os
  componentes compartilhados diretamente; todas as páginas herdam o novo visual.
- Q: O Navbar hoje tem 6 itens (Home, Categorias, Masculino, Feminino, Promoções, Contato). "Menu
  com poucos itens" deve manter todos, reduzir para o essencial, ou reduzir ao mínimo? → A: Reduzir
  para 3–4 itens essenciais de catálogo; "Contato" e "Promoções" saem do Navbar e passam a existir
  só no Rodapé.
- Q: O carrossel de "Produtos em Destaque" com poucos produtos (hoje só 2) deve sempre mostrar
  controles, esconder os controles quando não há itens suficientes para rolar, ou cair para grid
  estático abaixo de um mínimo? → A: Esconder os controles de navegação quando todos os itens já
  cabem na tela (nada para rolar).
- Q: O formulário de newsletter no Rodapé precisa de consentimento explícito (LGPD) ou é só
  campo de e-mail + botão? → A: Exige consentimento explícito — checkbox não pré-marcado + link
  para política de privacidade.
- Q: A nova paleta preto/branco/metálico precisa atender um padrão mínimo de contraste de
  acessibilidade, ou o efeito visual editorial tem prioridade sobre isso? → A: MUST atender WCAG AA
  (4.5:1 texto normal / 3:1 texto grande) em toda a Home.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Primeira impressão premium na Home (Priority: P1)

Como visitante que chega pela primeira vez na Home da Versa Store, quero que a página transmita
imediatamente uma sensação de moda premium/luxo (e não de "loja genérica"), para que eu confie na
qualidade dos produtos e me sinta convidado a explorar o catálogo.

**Why this priority**: É o valor central do pedido — sem essa mudança de percepção visual, nenhuma
das seções individuais (categorias, produtos, rodapé) cumpre o objetivo do redesenho. É a fatia
mínima que já entrega o resultado pedido mesmo sozinha.

**Independent Test**: Pode ser testado carregando a Home e avaliando, isoladamente, se a primeira
tela (hero) e a paleta/tipografia globais já comunicam "premium/luxo" — sem depender de Categorias,
Produtos ou Rodapé estarem prontos.

**Acceptance Scenarios**:

1. **Given** um visitante abre a Home, **When** a página carrega, **Then** ele vê uma seção hero em
   tela cheia com uma imagem estática de produto em alta resolução e um texto sobreposto mínimo
   (uma tag, um título, uma frase curta, uma chamada para ação — sem mais elementos que isso).
2. **Given** um visitante está em qualquer ponto da Home, **When** ele observa cores, botões e
   estados ativos, **Then** não aparece nenhum azul (#1E3A8A) ou laranja (#F97316) do design
   anterior — apenas preto, branco e o tom metálico de destaque.
3. **Given** um visitante observa os títulos de seção, **When** ele lê "Categorias" e "Produtos em
   Destaque", **Then** a tipografia usa letras espaçadas (letter-spacing perceptível) e tamanho
   maior que o texto corrido, de forma consistente entre as seções.

---

### User Story 2 - Header minimalista e navegação enxuta (Priority: P2)

Como visitante navegando pela Home, quero um cabeçalho limpo — com a logo estilizada, poucos itens
de menu e ícones discretos (busca, conta, favoritos, carrinho) — para localizar rapidamente o que
preciso sem poluição visual.

**Why this priority**: O header aparece em toda a Home e é o elemento mais "visível" de identidade
de marca; entregar a US1 sem revisar o header deixaria a logo antiga (com fundo colorido) destoando
do restante já redesenhado.

**Independent Test**: Pode ser testado isoladamente inspecionando o header renderizado: confirma-se
que a logo não usa emoji/ícone colorido, que o menu tem poucos itens e que os ícones de ação são
monocromáticos/discretos — independente do estado das demais seções.

**Acceptance Scenarios**:

1. **Given** o header é renderizado, **When** o visitante observa a logo, **Then** ela aparece em
   tratamento minimalista e sofisticado (sem emoji, sem ícone multicolorido), coerente com a nova
   paleta preto/branco/metálico.
2. **Given** o header é renderizado, **When** o visitante observa os ícones de ação, **Then** busca,
   conta, favoritos e carrinho aparecem discretos (monocromáticos), sem os tons de azul/laranja
   anteriores.
3. **Given** o menu de navegação é renderizado, **When** o visitante conta os itens, **Then** há no
   máximo 3–4 itens essenciais de catálogo, sem "Contato" ou "Promoções" (movidos para o Rodapé).

---

### User Story 3 - Categorias e produtos como vitrine editorial (Priority: P3)

Como visitante explorando a Home, quero ver categorias e produtos apresentados com fotos grandes em
um layout "arejado" (bastante espaço em branco) e com uma interação sutil ao passar o mouse, para
que a experiência pareça uma vitrine de grife e não um catálogo genérico com ícones ilustrativos.

**Why this priority**: Depende visualmente das US1/US2 já estarem no ar (mesma paleta/tipografia);
é o refinamento que completa a "vitrine editorial", mas a Home já comunica premium/luxo mesmo antes
dessa seção estar 100% refinada.

**Independent Test**: Pode ser testado isoladamente rolando até Categorias e Produtos em Destaque e
verificando: (a) categorias exibidas como fotos grandes (não ícones ilustrativos), (b) produtos
exibidos com fotografia grande em um carrossel navegável, (c) hover com leve zoom, sem animação
exagerada, (d) espaçamento generoso entre as seções.

**Acceptance Scenarios**:

1. **Given** o visitante rola até "Categorias", **When** a seção é exibida, **Then** cada categoria
   aparece como uma foto grande em um grid editorial, substituindo os ícones ilustrativos atuais.
2. **Given** o visitante rola até "Produtos em Destaque", **When** a seção é exibida, **Then** cada
   produto aparece com fotografia grande dentro de um carrossel navegável, e ao passar o mouse sobre
   o card ocorre um leve zoom (transição suave), sem animações chamativas.
3. **Given** o visitante rola pela Home em qualquer ponto, **When** ele observa o espaçamento entre
   Hero, Categorias, Produtos em Destaque e Rodapé, **Then** há espaço em branco perceptivelmente
   maior que no design anterior, dando sensação de layout "respirado".

---

### Edge Cases

- O que acontece quando uma categoria ou produto ainda não tem uma foto grande disponível (dado
  atual: `product.image` vem vazio e categorias usam emoji)? A Home precisa de um estado de
  fallback visualmente coerente com a nova estética (não pode voltar a mostrar emoji/ícone colorido
  nem quebrar o layout do grid).
- Como o hero em tela cheia se comporta em telas muito estreitas (celulares pequenos), onde texto
  sobreposto e imagem de produto podem se sobrepor de forma ilegível?
- No carrossel de "Produtos em Destaque", os controles de avançar/voltar MUST ser acessíveis por
  teclado (foco visível, ativáveis por Enter/Espaço); quando há poucos produtos e todos cabem na
  tela (hoje só 2), os controles ficam ocultos em vez de inativos (ver FR-005).
- O que acontece com um usuário autenticado (sessão Firebase ativa) — o header continua mostrando
  estado de login/logout corretamente com o novo tratamento visual de ícones?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A Home MUST exibir, no primeiro carregamento, uma seção hero em tela cheia com uma
  imagem estática de produto em alta resolução (sem vídeo) e texto sobreposto limitado a uma tag, um
  título, uma frase curta e uma chamada para ação.
- **FR-002**: A Home MUST substituir a paleta azul/laranja atual por uma paleta preto/branco + tom
  de destaque metálico (dourado ou bronze) em todos os usos de cor (fundos, textos, botões, estados
  ativos e de hover).
- **FR-003**: Os títulos de seção e de produto/categoria MUST usar tratamento tipográfico editorial
  (letter-spacing ampliado, tamanho maior que o texto corrido), aplicado de forma consistente no
  Header, Hero, Categorias e Produtos em Destaque.
- **FR-004**: A seção "Categorias" MUST exibir cada categoria como uma foto grande em vez do ícone
  ilustrativo atual. Categorias e produtos MAY usar imagens de banco de imagens/placeholder de alta
  qualidade como ponto de partida (fotografia própria da Versa Store poderá substituí-las depois,
  sem exigir mudança estrutural no layout).
- **FR-005**: A seção "Produtos em Destaque" MUST exibir cada produto com fotografia grande em um
  carrossel navegável (com controles de avançar/voltar acessíveis por teclado) e MUST reagir ao
  hover com um leve zoom (transição suave), sem animação exagerada. Quando todos os produtos já
  couberem na largura visível (poucos itens, ex.: os 2 do catálogo atual), os controles de
  avançar/voltar MUST ficar ocultos em vez de exibidos inativos.
- **FR-006**: O Header MUST ser minimalista: logo estilizada (sem emoji, sem ícone multicolorido),
  um conjunto reduzido de itens de navegação — no máximo 3–4 itens essenciais de catálogo (ex.:
  Novidades, Masculino, Feminino, Acessórios) — e ícones discretos/monocromáticos para busca, conta,
  favoritos e carrinho. "Contato" e "Promoções" MUST sair do menu de navegação principal.
- **FR-007**: A Home MUST apresentar espaçamento em branco generoso entre Hero, Categorias, Produtos
  em Destaque e Rodapé, perceptivelmente maior que no layout anterior.
- **FR-008**: O Rodapé MUST apresentar grupos de links organizados (incluindo "Contato" e
  "Promoções", removidos do menu principal), um formulário de inscrição em newsletter e links de
  redes sociais, com o mesmo tratamento visual premium das demais seções. O formulário de newsletter
  MUST incluir consentimento explícito (checkbox não pré-marcado) com link para a política de
  privacidade antes de permitir o envio do e-mail.
- **FR-009**: Todos os elementos interativos (botões, links, cards) MUST usar transições suaves em
  mudanças de estado (hover/focus), sem animações abruptas ou chamativas.
- **FR-010**: A Home redesenhada MUST permanecer totalmente responsiva, preservando a mesma
  elegância (paleta, tipografia, proporções de espaçamento) do mobile ao desktop.
- **FR-011**: O redesenho MUST reaproveitar a estrutura de componentes já existente em
  `frontend/src/pages/Home` (Header, HeroBanner, Categories, FeaturedProducts, Footer etc.) em vez de
  introduzir uma nova arquitetura de página. Como Header, Navbar e Footer são componentes
  compartilhados via `MainLayout`, o novo tratamento visual MUST ser aplicado neles diretamente —
  todas as páginas do site (não só a Home) passam a herdar a nova paleta/tipografia.
- **FR-012**: O redesenho MUST NOT alterar ou quebrar a integração com Firebase já usada na Home
  (estado de autenticação, leituras de dados exibidas na página).
- **FR-013**: A logo "Versa Store" MUST ser reestilizada com tratamento minimalista e sofisticado,
  coerente com a nova paleta e tipografia, sem emoji e sem ícone multicolorido.
- **FR-014**: Todo texto exibido sobre a nova paleta preto/branco/metálico (incluindo texto
  sobreposto ao hero) MUST atender contraste mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto
  grande) em relação ao fundo correspondente.

### Key Entities

- **Category**: categoria de produto exibida na Home; passa a exigir uma imagem fotográfica grande
  associada (hoje tem apenas nome + ícone ilustrativo).
- **Product**: produto exibido em "Produtos em Destaque"; passa a depender de fotografia grande
  associada para a vitrine editorial (hoje o campo de imagem existe no dado mas está vazio).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em uma avaliação qualitativa comparativa, pelo menos 90% dos avaliadores descrevem a
  Home redesenhada como "premium" ou "de grife", contra o design anterior.
- **SC-002**: A Home mantém o orçamento de performance já estabelecido para a loja (interativa em
  menos de 3 segundos em um perfil de celular intermediário com conexão "Fast 3G"), mesmo com o
  acréscimo de imagens grandes.
- **SC-003**: 100% das seções da Home (Header, Hero, Categorias, Produtos em Destaque, Rodapé)
  refletem visualmente a paleta preto/branco/metálico, com zero ocorrências remanescentes das cores
  azul/laranja anteriores.
- **SC-004**: O layout da Home se adapta corretamente em pelo menos 3 larguras de tela
  representativas (celular, tablet, desktop) sem sobreposição, corte de conteúdo ou perda de
  legibilidade.
- **SC-005**: Zero emojis ou ícones ilustrativos multicoloridos permanecem no Header, em Categorias
  ou em Produtos em Destaque.
- **SC-006**: 100% dos pares texto/fundo na Home passam em uma checagem de contraste WCAG AA
  (4.5:1 texto normal, 3:1 texto grande).

## Assumptions

- O tom metálico de destaque (dourado ou bronze) será decidido durante o planejamento visual; na
  ausência de preferência explícita, o padrão assumido é um tom dourado quente, por ser o mais comum
  em referências de moda de luxo.
- TopBar e Rodapé mantêm sua base em tom escuro (já usada hoje) como ponto de partida, ajustada para
  a nova paleta preto/branco/metálico em vez do azul-marinho atual.
- Dados de produto/categoria (nome, preço, avaliação) continuam vindo das mesmas fontes já usadas
  hoje (`data/products.js`, `data/categories.js` e/ou Firebase); o redesenho é uma mudança de
  apresentação visual, não de modelo de dados ou de fluxo de compra.
- O login/logout via Firebase exibido no Header continua funcionalmente igual; apenas o tratamento
  visual dos elementos (ícone, tipografia) muda.
