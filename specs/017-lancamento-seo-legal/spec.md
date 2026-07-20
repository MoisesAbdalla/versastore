# Feature Specification: Bloco de Lançamento — SEO, Institucional e Legal (017 / M8)

**Feature Branch**: `017-lancamento-seo-legal`

**Created**: 2026-07-19

**Status**: Draft

**Input**: User description: deixar a loja publicável — encontrável (SEO), com identidade institucional (sobre/contato/dados da empresa no rodapé) e juridicamente adequada (termos de uso e política de privacidade reais substituindo os provisórios do M3, política de trocas com o direito de arrependimento de 7 dias do CDC, re-aceite por versão dos termos). Sem servidor, sem Blaze.

## Contexto

A loja está funcionalmente completa para o lançamento sem pagamento online (checkout M4a, frete M5a, cupons 013, desejos 014, avaliações 015, retirada 016), mas ainda não é **publicável**: as páginas legais de /termos e /privacidade são placeholders do M3, não há política de trocas, o rodapé não tem os dados da empresa, e as páginas não têm meta tags/sitemap para serem encontradas. Esta feature fecha esses três blocos. O aceite de termos já grava `termsVersion` no perfil (M3), mas **não há gate de re-aceite** quando a versão muda — publicar textos novos exige esse gate.

## Clarifications

### Session 2026-07-19

- Q: De onde vêm os dados da empresa (razão social, CNPJ, endereço, contato)? → A: **Configuráveis no admin** — nova tela "Dados da loja"; rodapé e Contato leem da configuração; campos vazios são omitidos e o admin sinaliza a pendência de lançamento.
- Q: Quem redige os textos legais? → A: **Minutas completas pelo assistente** (padrão e-commerce BR: LGPD + CDC com arrependimento de 7 dias, adaptadas à operação da VersaStore), **marcadas para revisão do lojista/advogado** antes do ar — não constituem aconselhamento jurídico.
- Q: Alcance do re-aceite? → A: **Antes de comprar e na conta** — o gate aparece na área logada e **bloqueia a finalização do checkout** até o aceite da versão vigente; navegação pública segue livre.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conteúdo legal real com re-aceite (Priority: P1) 🎯 MVP

O cliente encontra, em páginas próprias e linkadas no rodapé, os **Termos de uso**, a **Política de privacidade** (adequados a e-commerce brasileiro/LGPD) e a **Política de trocas e devoluções** com o **direito de arrependimento de 7 dias (art. 49 do CDC)** destacado. Quando os textos são publicados com uma **nova versão**, o cliente que aceitou a versão antiga é **re-solicitado** a aceitar ao entrar na área logada; o novo aceite (versão + data) fica registrado. A navegação pública (vitrine, produto) não é travada pelo re-aceite.

**Why this priority**: é o requisito jurídico do lançamento — sem os textos reais e o arrependimento de 7 dias visível, a loja não deve ir ao ar. O re-aceite garante que a base instalada fique coberta pela versão vigente.

**Independent Test**: abrir /termos, /privacidade e /trocas e ver os textos reais (com a cláusula dos 7 dias em destaque na de trocas); com um usuário que aceitou a versão antiga, entrar na conta → gate de re-aceite; aceitar → registro da nova versão + data; não ser mais solicitado.

**Acceptance Scenarios**:

1. **Given** as páginas legais publicadas, **When** o cliente as abre, **Then** vê os textos reais versionados (não placeholders), em pt-BR, com a data/versão vigente.
2. **Given** a política de trocas, **When** exibida, **Then** o **direito de arrependimento de 7 dias (CDC art. 49)** aparece de forma destacada; a página é linkada no rodapé e no checkout.
3. **Given** um usuário cujo `termsVersion` é anterior à vigente, **When** entra na área logada, **Then** vê o pedido de re-aceite com link para os textos; **When** aceita, **Then** a nova versão + data são registradas e o gate não reaparece.
4. **Given** um visitante não logado, **When** navega pela vitrine, **Then** nenhum gate o interrompe (páginas legais são públicas).
5. **Given** um usuário que recusa/adia o re-aceite, **When** tenta usar a área logada, **Then** o comportamento definido no clarify se aplica (bloquear checkout vs. só insistir na conta).

---

### User Story 2 - Identidade institucional (Priority: P1)

O cliente encontra as páginas **Sobre** e **Contato** (canais reais da loja) e vê, no **rodapé de todas as páginas da loja**, os **dados da empresa**: razão social, CNPJ, endereço e contato — transmitindo a confiança exigida de um e-commerce sério (e a identificação do fornecedor exigida pelo CDC/Decreto do e-commerce).

**Why this priority**: identificação do fornecedor (razão social/CNPJ/endereço) é obrigação legal do e-commerce brasileiro (Decreto 7.962/2013) e requisito de confiança do comprador.

**Independent Test**: abrir /sobre e /contato e ver o conteúdo; conferir o rodapé em home/produto/checkout com razão social, CNPJ, endereço e contato.

**Acceptance Scenarios**:

1. **Given** qualquer página da loja, **When** o cliente rola até o rodapé, **Then** vê razão social, CNPJ, endereço e canal de contato.
2. **Given** a página Contato, **When** aberta, **Then** mostra os canais reais (e-mail/WhatsApp/telefone conforme configurado) sem depender de servidor (sem formulário com backend).
3. **Given** a página Sobre, **When** aberta, **Then** apresenta a loja (texto institucional editável conforme decisão do clarify).

---

### User Story 3 - Loja encontrável (SEO) (Priority: P2)

Cada página relevante tem **título e descrição próprios**; compartilhar um **produto** em rede social/WhatsApp mostra **nome, descrição, imagem e preço** (Open Graph/Twitter Card); a loja publica **sitemap** (páginas fixas + produtos ativos) e **robots.txt**; áreas privadas (admin, conta, checkout) **não são indexadas**.

**Why this priority**: torna a loja encontrável e compartilhável; é a ponte para tráfego orgânico. Menor que o bloco legal (a loja pode ir ao ar sem SEO perfeito, não sem os textos legais).

**Independent Test**: inspecionar o título/description de home, catálogo e produto; compartilhar a URL de um produto e ver o preview com imagem/nome/preço; acessar /sitemap.xml e /robots.txt; conferir que /admin, /conta e /checkout constam como não indexáveis.

**Acceptance Scenarios**:

1. **Given** a home, o catálogo, uma página de produto e as institucionais, **When** carregadas, **Then** cada uma tem title/description únicos e coerentes.
2. **Given** a URL de um produto compartilhada, **When** a plataforma gera o preview, **Then** aparecem nome, descrição, imagem e preço do produto (dentro dos limites de uma aplicação sem servidor — abordagem documentada no plano).
3. **Given** /sitemap.xml, **When** acessado, **Then** lista as páginas fixas e os produtos ativos; /robots.txt existe e exclui admin/conta/checkout.

---

### Edge Cases

- **Aplicação sem servidor (SPA)**: crawlers que não executam scripts podem não ver as meta dinâmicas de produto — o plano deve documentar a abordagem viável (meta por cliente + sitemap; limitações aceitas e registradas). O que for estático (home, institucionais, legais) deve ter meta garantida.
- **Usuário legado sem `termsVersion`** (null): tratado como versão antiga → passa pelo re-aceite.
- **Cadastro novo durante a transição**: quem se cadastra já aceita a versão nova (fluxos de cadastro/Google/completar-cadastro gravam a vigente) — não vê o gate.
- **Produto excluído/inativo**: fora do sitemap; a página do produto inexistente segue com o 404 amigável atual.
- **Dados da empresa incompletos** (se configuráveis e ainda não preenchidos): o rodapé não exibe campos vazios; a loja avisa o lojista no admin (pendência de lançamento).
- **Textos legais são minutas**: se redigidos pelo assistente, devem ser marcados para **revisão do lojista/advogado** antes do lançamento — são modelos informados, não aconselhamento jurídico.

## Requirements *(mandatory)*

### Functional Requirements

**Legal (M8)**

- **FR-001**: As páginas de **Termos de uso** e **Política de privacidade** MUST exibir textos reais adequados a e-commerce brasileiro (LGPD), substituindo os placeholders, com **versão/data vigente** visível.
- **FR-002**: Uma página de **Política de trocas e devoluções** MUST existir, com o **direito de arrependimento de 7 dias (CDC art. 49)** em destaque, linkada no **rodapé** e no **checkout**.
- **FR-003**: A **versão dos termos** MUST subir junto com os textos novos; usuários com aceite de versão **anterior** (ou sem versão) MUST ser **re-solicitados** a aceitar ao entrar na área logada; o novo aceite MUST registrar **versão + data**.
- **FR-004**: O re-aceite MUST NOT travar a navegação pública (vitrine/produto/carrinho); MUST bloquear a **finalização do checkout** e o uso da **área da conta** até o aceite da versão vigente (clarify 2026-07-19).
- **FR-005**: Novos cadastros MUST registrar a versão vigente (fluxos existentes) e não ver o gate.

**Institucional**

- **FR-006**: Páginas **Sobre** e **Contato** MUST existir, em pt-BR, sem dependência de servidor (canais diretos: e-mail/WhatsApp/telefone).
- **FR-007**: O **rodapé de todas as páginas da loja** MUST exibir: razão social, CNPJ, endereço e contato, lidos de uma **configuração editável no admin** ("Dados da loja"); campos vazios são omitidos e o admin sinaliza a pendência (clarify 2026-07-19).
- **FR-008**: O rodapé MUST linkar Termos, Privacidade e Trocas.

**SEO**

- **FR-009**: Cada rota pública relevante (home, catálogo, produto, institucionais, legais) MUST ter **title e meta description próprios**.
- **FR-010**: A página de **produto** MUST fornecer **Open Graph/Twitter Card** (nome, descrição, imagem, preço), na medida do viável sem servidor (abordagem e limitações documentadas no plano).
- **FR-011**: A loja MUST publicar **sitemap** (páginas fixas + produtos ativos) e **robots.txt**; /admin, /conta e /checkout MUST ser excluídos da indexação.
- **FR-012**: Páginas privadas MUST ter sinalização de não-indexação também no documento (meta robots), em defesa em profundidade ao robots.txt.

### Key Entities *(include if feature involves data)*

- **Versão dos termos**: identificador da versão vigente dos textos legais (data). Comparada com o `termsVersion` do perfil para decidir o re-aceite. O perfil registra versão + data do aceite (campos existentes do M3).
- **Dados da empresa**: razão social, CNPJ, endereço, contato(s) — exibidos no rodapé/contato. Origem (código vs. configuração do admin) definida no clarify.
- **Conteúdo institucional/legal**: textos de Sobre, Contato, Termos, Privacidade e Trocas (pt-BR, versionados no caso dos legais).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: As três páginas legais exibem textos reais versionados; a política de trocas destaca o arrependimento de 7 dias e está linkada no rodapé e no checkout.
- **SC-002**: 100% dos usuários com aceite antigo (ou sem registro) veem o gate de re-aceite na área logada e, ao aceitar, ficam registrados na versão vigente; nenhum usuário é solicitado duas vezes após aceitar.
- **SC-003**: O rodapé de todas as páginas da loja mostra razão social, CNPJ, endereço e contato; Sobre e Contato acessíveis.
- **SC-004**: Home, catálogo, produto e institucionais têm title/description únicos; o preview de compartilhamento de um produto mostra nome/imagem/preço (dentro da abordagem documentada).
- **SC-005**: /sitemap.xml lista as páginas fixas e os produtos ativos; /robots.txt exclui admin/conta/checkout; as páginas privadas têm meta de não-indexação.
- **SC-006**: A navegação pública nunca é bloqueada pelo re-aceite.

## Assumptions

- **Sem servidor**: tudo roda no cliente + hospedagem estática. As limitações de SEO de uma SPA (crawlers sem JS) são **aceitas e documentadas** — a solução completa (SSR/prerender) fica fora de escopo.
- **Textos legais**: minutas padrão e-commerce BR (LGPD/CDC) redigidas pelo assistente, adaptadas à operação real da loja, para **revisão do lojista/advogado** — modelo informado, não aconselhamento jurídico (clarify 2026-07-19).
- **Dados da empresa**: **configuráveis no admin** (tela "Dados da loja"); rodapé/Contato leem da configuração (clarify 2026-07-19).
- **Re-aceite**: gate na área logada **e** bloqueio da finalização do checkout até aceitar (clarify 2026-07-19).
- Reutiliza: páginas Legal existentes (estrutura), fluxo de aceite do M3 (`termsVersion`/`termsAcceptedAt`), Footer, design system, guards de rota existentes.
- Não quebrar: checkout (009/011/013/016), conta (007), vitrine, admin, avaliações (015), desejos (014).

### Out of Scope

- SSR/prerender pago ou infraestrutura de renderização para crawlers; analytics/pixels.
- Formulário de contato com backend; chat.
- E-mail transacional (M6 — Blaze).
- Aconselhamento jurídico formal (os textos são minutas para revisão).
