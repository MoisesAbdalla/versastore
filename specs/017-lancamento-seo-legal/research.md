# Research — Bloco de Lançamento (017 / M8)

Decisões (Fase 0). Formato: Decisão / Racional / Alternativas.

## R-1 — SEO numa SPA sem servidor: abordagem e limitações (documentadas)

**Decisão**: três camadas, sem dependência nova e sem SSR:
1. **`index.html` estático** com title/description/OG **da loja** (nome, descrição, logo) — é o que crawlers **sem JS** (WhatsApp/Facebook scraper) veem para qualquer URL.
2. **Hook `usePageMeta({ title, description, og, noindex })`** aplicado por rota: atualiza `document.title` e injeta/atualiza `<meta>` no `<head>` via DOM. O Googlebot **executa JS** → indexação por página com title/description/OG corretos.
3. **Sitemap + robots**: descoberta de URLs de produto para crawlers.

**Limitação aceita e registrada**: preview de compartilhamento de **produto específico** em WhatsApp/redes mostrará as metas **da loja** (camada 1), não do produto — esses scrapers não executam JS. A solução real (SSR/prerender/Function de meta) fica para quando houver Blaze (nota para o M4b+). O FR-010 é atendido "na medida do viável sem servidor".

**Alternativas**: react-helmet-async (dependência para o mesmo efeito — rejeitada); prerender de build por rota de produto (catálogo é dinâmico; páginas ficariam velhas — rejeitada); serviço pago de prerender (fora de escopo — rejeitada).

## R-2 — Sitemap gerado no build via API REST pública do Firestore

**Decisão**: script Node `frontend/scripts/generate-sitemap.mjs` (rodado no `prebuild`): consulta a API REST do Firestore (`runQuery` sem auth) filtrando `status == "ativo" && deleted == false` — exatamente o que as rules públicas permitem —, monta `public/sitemap.xml` com as páginas fixas (home, catálogo, sobre, contato, termos, privacidade, trocas) + `/product/{id}`, e grava o arquivo que o deploy do Hosting publica. Falha de rede no build → mantém o sitemap anterior (não quebra o build; avisa no log).

**Racional**: sem servidor e sem credenciais (leitura pública já permitida); o sitemap fica atualizado a cada deploy. Produtos criados entre deploys entram no próximo (aceitável em catálogo pequeno; internal links cobrem a descoberta).

**Alternativas**: sitemap só com páginas fixas (perde produtos — rejeitada); botão no admin que baixa o XML (passo manual sujeito a esquecimento — rejeitada); Cloud Function (Blaze — rejeitada).

## R-3 — robots.txt + noindex nas privadas

**Decisão**: `public/robots.txt` com `Disallow: /admin`, `/conta`, `/checkout`, `/login`, `/register`, `/recuperar-senha`, `/completar-cadastro`, `/acesso-negado` + `Sitemap: <url>/sitemap.xml`. Defesa em profundidade: `usePageMeta({ noindex: true })` nas rotas privadas injeta `<meta name="robots" content="noindex">`.

## R-4 — Dados da empresa em `settings/store` (admin "Dados da loja")

**Decisão**: doc único `settings/store` — `{ razaoSocial, cnpj, endereco, email, telefone, whatsapp }` (strings; vazias = omitidas) — no padrão do `settingsService` (leitura pública, escrita admin: **rules atuais já cobrem, sem deploy**). Tela admin **"Dados da loja"** (`/admin/loja`) com os campos + aviso de pendência quando faltarem dados obrigatórios de lançamento (razão social, CNPJ, endereço). `useStoreSettings` (cache de módulo) alimenta Footer e Contato.

**Alternativas**: fixos no código — rejeitada no clarify (o lojista edita sem deploy).

## R-5 — Conteúdo legal como módulos versionados; TERMS_VERSION nova

**Decisão**: minutas completas em `src/content/legal/` (`termos`, `privacidade`, `trocas`) como componentes de conteúdo (JSX simples, tipografia das páginas Legal atuais), com cabeçalho "versão vigente + data" e rodapé de **minuta para revisão** (não é aconselhamento jurídico). `TERMS_VERSION` sobe para **"2026-07-19"**; os três documentos compartilham a mesma versão vigente (um aceite cobre o conjunto, como no M3). Conteúdo adaptado à operação real: Pix/cartão/boleto (pagamento na entrega do M4b ainda não ativo — o texto cobre "meios oferecidos no checkout"), frete por tabela + retirada na loja (016), cupons, avaliações moderadas, conta/LGPD (dados coletados: nome, e-mail, telefone, CPF opcional, endereços, pedidos), arrependimento de 7 dias (CDC art. 49) com instruções de exercício.

**Alternativas**: markdown + parser (dependência nova — rejeitada); texto no Firestore editável no admin (conteúdo jurídico versionado precisa de trilha de código/commit — rejeitada nesta fase).

## R-6 — Gate de re-aceite no `PrivateRoute` (conta + checkout)

**Decisão**: helper puro `needsTermsReaccept(profile)` → `profile != null && profile.termsVersion !== TERMS_VERSION` (null/antiga → true). Componente `TermsGate`: se logado, perfil carregado e `needsTermsReaccept` → renderiza a tela de re-aceite (resumo do que mudou + links para os 3 documentos + checkbox + botão) **no lugar** dos filhos; aceitar chama `acceptCurrentTerms(uid)` (`updateDoc` de `termsVersion` + `termsAcceptedAt`, permitido pelas rules) e `reloadProfile()`. O `PrivateRoute` (usado por `/conta/*` e `/checkout*`) passa a envolver os filhos com `TermsGate` — bloqueia exatamente conta + finalização de compra (clarify), sem tocar vitrine/carrinho. `CompleteProfileGuard` roda antes (fluxo de cadastro incompleto tem prioridade e o completar-cadastro já grava a versão nova).

**Alternativas**: modal global — rejeitada (interromperia a navegação pública, contra FR-004); bloquear só o botão de confirmar do checkout — rejeitada (a conta ficaria acessível sem aceite; o guard cobre os dois com um componente).

## R-7 — Footer real + institucionais

**Decisão**: Footer ganha os **links reais** (Sobre, Contato, Termos, Privacidade, Trocas, Meus pedidos) via `ROUTES` (hoje são `<li>` mortos e um link quebrado `/privacy`), e um **bloco de identificação**: razão social · CNPJ · endereço · contato (de `settings/store`; campos vazios omitidos). Páginas **/sobre** (texto institucional estático da marca) e **/contato** (canais de `settings/store`: e-mail `mailto:`, WhatsApp `wa.me`, telefone `tel:` — sem formulário/backend). Newsletter existente permanece como está.

## Resumo de impacto
- **Sem deploy de rules/índices** (settings e users já cobertos). Novo doc `settings/store`.
- `TERMS_VERSION` → "2026-07-19"; re-aceite via gate no `PrivateRoute`; aceite grava no próprio doc.
- Sitemap no build (REST pública) + robots.txt + meta por rota via hook; limitação de OG por produto documentada (resolve com servidor no futuro).
- 3 minutas legais versionadas (revisão do lojista/advogado antes do ar).
