# Versa Store - Design System

## Visão

A Versa Store possui uma identidade moderna, minimalista e tecnológica.

Nosso objetivo é transmitir:

- Confiança
- Velocidade
- Tecnologia
- Segurança
- Elegância

---

# Paleta de Cores

Redesenho premium/luxo (2026-07-10): a paleta passou de azul/laranja para preto/branco + um
acento metálico dourado, inspirada em e-commerce de moda de grife. Ver
`specs/001-home-luxury-redesign/research.md` §4 para o cálculo de contraste que embasa os
valores abaixo.

## Primary

Preto

#0B0B0C (`--primary`)

Utilização:

- TopBar, Header (fundo), Footer
- Estados de hover sólidos (ex.: card de categoria)
- Texto de preço em destaque

Contraste: 19.67:1 contra branco — passa WCAG AA em qualquer tamanho de texto.

---

## Secondary (dourado)

Dourado

#B08D57 (`--secondary`) — acentos, texto grande, bordas/ícones, texto de qualquer tamanho sobre
fundo preto (contraste 6.36:1)

#8C6D3F (`--gold-text`) — texto dourado de **tamanho normal sobre fundo branco** (contraste
4.80:1). `--secondary` sozinho só passa AA sobre branco em texto grande (≥24px ou ≥18.66px
bold — contraste 3.09:1); não usar `--secondary` para texto normal sobre branco.

Utilização:

- Tags, CTAs, badges, sublinhados, ícones ativos
- Preço em destaque sobre fundo branco → usar `--gold-text`, não `--secondary`

---

## Success

#22C55E

Pedidos pagos
Produto disponível

---

## Error

#EF4444

Erros
Estoque esgotado

---

## Background

#FFFFFF (`--background`)

O tom bege anterior (#E8E6E0, ligado à logo antiga) foi descartado — a logo foi refeita como
um lockup tipográfico (ver seção Logo) e a paleta preto/branco/dourado usa branco puro como
fundo padrão da página.

---

## Surface

#FFFFFF (`--surface`) — mesma cor do Background; a separação entre superfícies vem de borda
fina (`--border`), não de contraste de cor ou sombra.

---

## Text Primary

#0B0B0C (`--text`) — 19.67:1 contra branco.

---

## Text Secondary

#5C5C5C (`--text-muted`) sobre fundo branco — 6.69:1.

#B5B5B5 (`--text-muted-inverse`) sobre fundo preto — 9.59:1.

---

# Border

#E3E3E0 (`--border`) sobre fundo branco.

`rgba(255,255,255,.14)` (`--border-inverse`) sobre fundo preto.

---

# Border Radius

0 (`--radius`)

Cantos totalmente retos — sem nenhum arredondamento — em botões, inputs, cards de
produto/categoria e tags.

Exceções permitidas: elementos circulares deliberados (ex.: botão de favorito) continuam
`border-radius: 50%` — isso não é "arredondamento de canto", é uma forma circular
intencional.

---

# Sombras

`--shadow: 0 1px 3px rgba(11,11,12,.06)`

Sombras devem ser discretas ou ausentes. Prefira bordas finas (`--border`) a sombras para
separar superfícies (cards de produto, header). Menus e modais podem usar `--shadow` para
indicar elevação, mas nunca sombras pesadas/difusas.

---

# Tipografia de Apoio (labels, tags, categorias)

`letter-spacing: .14em` (`--tracking`) + `text-transform: uppercase` + peso 600, tamanho
11–14px.

Usado em: título de seções ("Categorias", "Produtos em Destaque"), tag de destaque do hero,
rótulo de categoria no card de produto, botões de ação (Comprar, Entrar). Dá o tom
editorial/premium mantendo a paleta de cores existente.

---

# Espaçamentos

4

8

12

16

24

32

48

64

---

# Fonte

**Títulos (`--font-heading`)**: Playfair Display (serifada, alto contraste) — Google Fonts,
licença SIL OFL 1.1, self-hosted em `frontend/src/assets/fonts/`.
Fallback: Georgia, "Times New Roman", serif.

**Corpo/UI (`--font-body`)**: Inter (sans-serif) — Google Fonts, licença SIL OFL 1.1,
self-hosted em `frontend/src/assets/fonts/`.
Fallback: -apple-system, "Segoe UI", Roboto, sans-serif.

Ambas carregadas via `@font-face` com `font-display: swap` (nunca bloqueiam o primeiro paint
esperando o download da fonte) — ver `frontend/src/styles/globals.css`. Substituem Poppins
(que não chegou a ser self-hosted no projeto).

---

# Botões

Primary

Secondary

Outlined

Danger

Success

---

# Inputs

Borda reta (`--radius: 0`)

Focus: borda `--primary` (preto)

Erro vermelho (`--error`, inalterado)

---

# Cards

Produto

Categoria

Pedido

Usuário

---

# Painel Administrativo (003-admin-dashboard, 2026-07-12)

O painel (`/admin/*`) compartilha os tokens da loja (`variables.css`) com padrões próprios,
documentados aqui na mesma PR que os introduziu (constituição, Princípio III).

## AdminLayout

- Sidebar fixa 240px sobre `--primary` (preto), itens em `--text-muted-inverse`, item ativo em
  `--secondary` com borda esquerda de 2px; vira Drawer em < 900px.
- Header 64px sobre `--surface` com busca global (produtos + pedidos, dropdown de resultados) e
  nome do usuário logado.

## DataTable (tabelas do painel)

- Skeleton de 6 linhas no carregamento; estado vazio via EmptyState (orientação de próximo passo);
  estado de erro com "Tentar novamente".
- Ordenação apenas nas colunas com índice composto no Firestore; paginação por cursor
  ("Anterior/Próxima", 20 por página); seleção em massa com checkbox.
- Linhas clicáveis são focáveis (Tab) e ativáveis com Enter.
- Colunas numéricas: alinhadas à direita, presas ao conteúdo (`width: 1%` + `nowrap`).

## StatCard (indicadores)

- Rótulo uppercase em `--text-muted`, valor em `--font-heading` 26px.
- Delta percentual com sinal + cor (verde `#15803D` / vermelho `#B3261E` — tons escurecidos para
  contraste de TEXTO sobre branco); sem base de comparação exibe "—".

## SalesChart (gráfico de vendas)

- SVG próprio, altura fixa 280px, largura acompanha o container (ResizeObserver).
- Cor de série `#A87420` — validada pelo validador da skill de dataviz (croma ≥ 0.1 e contraste
  ≥ 3:1 sobre `#FFFFFF`); o `--secondary` da marca reprova no piso de croma (lê como cinza) e não
  deve ser usado como cor de série.
- Linha 2px, grid recessivo em `--border` (4 linhas), rótulos de eixo 10px em `--text-muted`,
  crosshair + tooltip no hover, tabela oculta para leitores de tela.

## Feedback e confirmação

- Toasts via `FeedbackContext` (MUI Snackbar + Alert `filled`), sucesso/erro, 5s.
- Toda ação destrutiva passa por `ConfirmDialog` (fecha com Esc; botão destrutivo `color="error"`).
- Estados vazios via `EmptyState`: título em `--font-heading`, ação em botão outline uppercase.

## Chips de status

- Pedido: aguardando pagamento `warning` · pago/em separação `info` · enviado `primary` ·
  entregue `success` · cancelado `error` · devolvido `default` — sempre `variant="outlined"` com o
  rótulo em português (nunca cor sozinha).
- Produto: ativo `success` · inativo `default` · rascunho `warning`.
- Alertas da visão geral usam badges com rótulo textual ("Sem estoque", "Estoque baixo",
  "Aguardando envio", "Cadastro incompleto — <campo>").

## Formulários do painel

- Campos monetários como texto ("199,90", parse em `utils/format.js`); datas com máscara
  dd/mm/aaaa (label fixo via `slotProps`, sem input date nativo — formato brasileiro garantido).
- Campos em linha reservam a faixa de helperText e alinham pelo topo (baseline estável entre
  TextField e Select).
- Descrição rica via `RichTextField` (negrito/itálico/listas), HTML sanitizado por allowlist.

## Exportação CSV

- Botão "Exportar CSV" (ícone Download) nas listagens e relatórios; o arquivo reflete exatamente
  os filtros da tela; BOM UTF-8 + separador ";" (Excel pt-BR); toast com o nº de linhas.


---

# Vitrine / Loja (005-vitrine-completa, 2026-07-13)

A vitrine pública (`/products`, `/product/:id`, `/cart`) compartilha os tokens de `variables.css` e
o `MainLayout` (TopBar + Header + Navbar + Footer).

## Catálogo (`/products`)

- Grade responsiva `repeat(auto-fill, minmax(240px, 1fr))`; `ProductCard` de 300px (max-width 100%).
- Filtro de categoria em **2 níveis** (FR-003): chips de categorias raiz; ao selecionar uma raiz com
  filhas, um segundo nível de chips (com "Todos"). Estado na URL (`?categoria=<raiz>&sub=<filha>`).
- Ordenação via `SortSelect` (recentes/preço↑↓/nome↑↓), desabilitada durante busca.
- Estados: skeleton (shimmer), vazio (com "limpar filtros"), erro (com "tentar novamente").
- Paginação "carregar mais" (anexa; cursor).

## ProductCard

- Card-link inteiro navega ao produto; imagem via Cloudinary por contexto (`w=400`); coração de
  wishlist (visual); badge **"Esgotado"** (canto inferior, fundo `--primary`) quando `totalStock 0`.
- Preço via `PriceTag`.

## PriceTag

- Preço normal; com promoção vigente (avaliada no fuso America/Sao_Paulo): preço original riscado +
  promocional em `--gold-text` + selo de desconto `-N%` (verde `#15803D`). Tamanhos `md`/`lg`.

## Página de produto (`/product/:id`)

- Layout 1 coluna → 2 colunas em ≥860px. `ProductGallery`: imagem principal (`w=800`) + miniaturas
  (`w=120`); zoom desktop por lupa (`background-position`), mobile por modal (imagem `w=1600` +
  pinch nativo).
- `VariationSelector` **por atributo** (feature 008): uma linha de opções por atributo (ex.: Tamanho
  em cima, Cor embaixo), **todas visíveis desde o início**, com os valores na ordem declarada pelo
  lojista. Ao escolher um valor, os valores do outro atributo sem combinação disponível (inexistente
  ou esgotada) ficam **desabilitados/riscados**; ordem de escolha livre; clicar no valor marcado
  desmarca. Estoque e botão "Adicionar ao carrinho" só reagem quando **todos** os atributos estão
  selecionados (variação resolvida). Produto simples (sem atributos) não mostra seletor. A lógica de
  disponibilidade fica no hook `useVariationSelection`; o componente é só apresentação.
- Indicador "últimas unidades" quando estoque ≤ limiar do produto. Botão "Adicionar ao carrinho"
  (esgotado desabilita). 404 amigável para produto inativo/inexistente **ou sinalizado como
  inconsistente** (feature 008).

## Carrinho

- `CartBadge` no header: ícone com contador (`--secondary`).
- Página `/cart` (M2): itens + quantidade/remover + subtotal, persistida em `localStorage`
  **por identidade** (`versastore:cart:<uid>`, `:guest` p/ anônimo — feature 007). Ao abrir,
  **revalida** cada item contra o Firestore (preço/estoque atuais, remove indisponíveis) e mostra um
  **aviso** listando o que mudou (borda dourada). O CTA **"Finalizar compra"** leva ao checkout
  (feature 009).

## Checkout (009-checkout / M4a, 2026-07-15)

- Rota `/checkout` sob `PrivateRoute` (visitante → login). **Uma página**, coluna principal +
  resumo fixo (sticky), colapsando em 1 coluna < 860px.
- **Itens**: revalidados de novo ao entrar (reusa a revalidação do carrinho); mudanças aparecem num
  bloco de aviso (borda `--secondary`) com botão "Revisei, pode continuar" que **destrava** a
  confirmação.
- **Endereço**: rádios entre os endereços salvos (M3), padrão pré-selecionado; sem endereço, CTA para
  `/conta/enderecos` e bloqueio.
- **CPF**: `FormField` + `maskCpf`, validado por `validateCpf` (2 DVs); checkbox **opt-in** "salvar para
  as próximas compras".
- **Pagamento**: rádios Pix / Cartão / Boleto — **só a seleção** (o pagamento real é o M4b, atrás da
  interface `paymentProvider`).
- **Resumo**: Subtotal + **Frete "A combinar"** + Total (`= subtotal + frete`, com frete 0/null na
  M4a); botão "Confirmar pedido" desabilitado até endereço + CPF válido + método + itens revisados;
  hints de bloqueio abaixo do botão.
- **Sucesso** (`/checkout/sucesso`): card centralizado com "Pedido criado / aguardando pagamento", o
  número do pedido e CTAs "Ver meus pedidos" / "Continuar comprando".
- Lógica no hook `useCheckout` (revalidação, endereço/CPF/método, `canConfirm`, `confirm`); a criação
  do pedido reusa a transação de estoque (`orderService.createOrder`) — receita/totais do cliente só
  contam na transição **`pago`** (admin em M4a; webhook no M4b).

## Busca

- Campo no header submete no Enter/lupa → `/products?q=termo` (sem consulta ao vivo). Resultados por
  relevância/recência; compõe com uma categoria.

# Conta do Cliente (007-conta-cliente, 2026-07-13)

Telas de autenticação e área de conta, sob o `MainLayout`, responsivas (usáveis em 375px), com
feedback de erro **campo a campo** em pt-BR (nunca `alert`).

## Formulários da loja (`components/form/`)

- **`FormField`**: rótulo + input + mensagem de erro no próprio campo (só após `touched`/blur ou
  tentativa de submit); `aria-invalid`/`aria-describedby`. Aceita `disabled` e `hint` (campo somente
  leitura, ex.: e-mail em "Meus dados").
- **`PasswordField`**: mostrar/ocultar (ícone MUI) + indicador de força (0..4 barras) via
  `passwordStrength` de `utils/validation.js`.
- **`Checkbox`**: aceite de termos com links embutidos (LGPD).
- **`GoogleButton`**: "Entrar/Cadastrar com Google" — ícone G em SVG inline (sem asset externo);
  divisor "ou" separando do formulário.
- Orquestração de estado/validação: hook `useAuthForm(initialValues, schema)`
  (`values/errors/touched/setField/blurField/validateAll`).

## Telas

- **Login** (`/login`), **Cadastro** (`/register`), **Recuperar senha** (`/recuperar-senha`),
  **Completar cadastro** (`/completar-cadastro`, passo pós-Google): card centralizado (max-width
  420–460px) sobre `--surface` com borda. Recuperação mostra **sempre** a mesma confirmação neutra
  (não vaza existência de conta).
- **Páginas legais** (`/termos`, `/privacidade`): conteúdo provisório (aviso de substituição no M8),
  exibem `TERMS_VERSION`; destino do checkbox de aceite.

## Área de conta (`/conta`)

- **`AccountLayout`**: uma página com **abas** (`NavLink` + `Outlet`) — Meus dados / Meus pedidos /
  Meus endereços. Estrutura extensível (Lista de Desejos entra como aba na Fase C). Usa o
  `PageContainer` na variante **`narrow`** (max-width 760px) — área majoritariamente de formulário.
- **Menu do usuário** (`UserMenu`, no header quando logado): dropdown com Minha conta / Meus pedidos
  / Meus endereços, **separador** e Sair; item **Painel admin** quando `isAdmin`; fecha em
  clique-fora/Esc.
- **Meus dados**: edita nome+telefone (mantém `nameLower`/displayName), e-mail somente leitura,
  "alterar senha" por e-mail de redefinição.
- **Meus pedidos**: lista (nº, data, status, valor) + detalhe (itens com preço do momento, endereço,
  status, rastreio); badge de status local; estados carregando/vazio/erro. Vazio → CTA "Ver produtos".
- **Meus endereços**: CRUD com busca por CEP (ViaCEP; falha cai para preenchimento manual), marcar
  padrão (um só). Vazio → CTA **"+ Adicionar endereço"** (a ação que resolve o vazio).

## `PageContainer` (container compartilhado)

- Fonte única de `max-width` + `padding: 32px 24px 64px` + centralização. Padrão **1200px**
  (catálogo/produto); variante **`narrow` 760px** (conta). `html { scrollbar-gutter: stable }` mantém
  o eixo central idêntico entre páginas curtas e longas.
- **`EmptyState`** aceita `actionOnClick` (ação na própria página) além de `actionTo` (link): o CTA do
  vazio deve ser a ação que resolve o vazio.

# Variações por Atributo (008-variacoes-por-atributo, 2026-07-13)

Modelo: `product.attributes: [{ name, values: string[] }]` (ordenado); cada variação escolhe um valor
por atributo. Regra única de consistência em `utils/variationValidation.js`, reusada por form, service
e migração.

## Editor de variações no admin (`Products/Form`)

- **`AttributeEditor`**: define/renomeia/remove atributos e, por atributo, adiciona/**reordena** (setas
  ↑↓)/remove valores. A ordem dos valores aqui é a ordem exibida na vitrine. Valores são **normalizados
  na entrada** (siglas/alfanuméricos em caixa alta — P, GG, 110V; palavras capitalizadas — Preta,
  Azul); duplicatas pós-normalização são rejeitadas. Remover um valor em uso é bloqueado.
- **Tabela de variações**: uma coluna (select do valor permitido) por atributo declarado + SKU, preço
  opcional, estoque. **"Gerar combinações"** cria o produto cartesiano dos valores (linhas existentes
  intactas, id estável); **"Adicionar variação"** para casos pontuais.
- **Validação**: salvar bloqueia variações inconsistentes (valor vazio, combinação duplicada, conjunto
  divergente); publicar (ativo) exige consistência. **Resolução de fusão** (`ConfirmDialog`): remover
  um atributo que faz variações colapsarem na mesma combinação abre um passo onde o lojista escolhe
  **manter uma** ou **somar estoques** — nunca automático.
- **Ids de variação estáveis**: editar/reordenar/renomear preserva o `id` da variação (carrinho salvo
  e pedidos continuam válidos); id novo só para combinação nova.

## Sinalização de inconsistência (produto oculto da vitrine)

- Campo derivado `variationsInconsistent` (+ `variationIssues`), recalculado em todo save e pela
  migração `backfillVariations` (dev). Produto sinalizado é **escondido da vitrine** (catálogo, Home,
  busca e página → 404 amigável).
- **Alerta impossível de ignorar no admin**: badge vermelho **"Variação inconsistente"** na linha da
  listagem; contador **"N produto(s) oculto(s) por inconsistência de variação"** + itens acionáveis no
  card de Alertas do dashboard; **banner** na tela de edição com os `variationIssues` e como corrigir.
  Corrigir e salvar limpa o flag e o produto volta à vitrine.

# Frete (011-frete-tabela / M5a, 2026-07-16)

Cálculo de frete por **tabela configurável** (sem API/servidor; a API real é o M5b). A lógica fica
atrás do provedor `shippingProvider` (implementação por tabela), para o M5b plugar a API sem tocar o
checkout — mesmo padrão do `paymentProvider`.

## Admin — tela de Frete (`/admin/frete`)

- Item **"Frete"** no menu do painel. Config em `settings/shipping` (leitura pública, escrita admin).
- **Regras por região**: nome, **faixas de CEP** (de–até, máscara), **valor** e **prazo** (dias), e
  faixa de valor do pedido opcional. Adicionar/remover regras e faixas.
- **Frete padrão "demais regiões"**: valor + prazo para CEPs sem regra (vazio = bloquear).
- **Frete grátis acima de**: limite configurável (alimenta o banner e o cálculo).
- Salvar valida a tabela (`validateShippingSettings`): faixas de 8 dígitos, `de ≤ até`, valor/prazo
  preenchidos, **sem sobreposição** de faixas; erros listados no topo.

## Checkout — frete calculado

- O frete é calculado pelo **CEP do endereço selecionado** (recalcula ao trocar de endereço/subtotal).
- Ordem: **frete grátis** (subtotal ≥ limite, prevalece) → **regra da região** → **frete padrão** →
  **sem regra** (bloqueia) / **sem tabela** (mantém "A combinar", permite finalizar — fallback M4a).
- Resumo: linha **Frete** com "R$ X · até N dias úteis" / "Frete grátis" / "Calculando…" / "A
  combinar"; **Total = subtotal + frete**. Frete **congelado** no pedido (`shipping`, `shippingEtaDays`,
  `shippingMethod`, `shippingCep`, `shippingStatus`) — alterar a tabela depois não muda pedidos feitos.

## Banner

- O TopBar lê `freeShippingThreshold` (via `useShippingSettings`) e mostra "Frete grátis acima de
  R$X"; sem limite configurado, o banner de frete some.
