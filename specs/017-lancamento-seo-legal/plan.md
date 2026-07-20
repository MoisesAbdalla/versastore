# Implementation Plan: Bloco de Lançamento — SEO, Institucional e Legal (017 / M8)

**Branch**: `017-lancamento-seo-legal` (empilhada na 016) | **Date**: 2026-07-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-lancamento-seo-legal/spec.md`

## Summary

Tornar a loja **publicável** em três blocos: (1) **Legal** — minutas reais de Termos de uso, Política de privacidade (LGPD) e Política de trocas com o arrependimento de 7 dias (CDC art. 49) em destaque, versão nova de `TERMS_VERSION` e **gate de re-aceite** que bloqueia conta + finalização do checkout (navegação pública livre); (2) **Institucional** — tela admin **"Dados da loja"** (razão social, CNPJ, endereço, contatos) em `settings/store`, exibidos no **rodapé** (com links legais reais) e nas novas páginas **/sobre** e **/contato**; (3) **SEO** — hook de meta por rota (title/description/OG/noindex), **sitemap gerado no build** a partir da leitura pública do catálogo, e **robots.txt** excluindo admin/conta/checkout. Sem servidor; limitações de SPA documentadas (R-1).

## Technical Context

**Language/Version**: JavaScript (ES Modules), React 19.2 + Vite 8 — sem TypeScript.

**Primary Dependencies**: Firebase SDK 12 (Firestore), React Router 7, MUI 9 (admin), CSS Modules. **Sem dependência nova** (meta via DOM no hook; sitemap via script Node no build usando a API REST pública do Firestore).

**Storage**: Firestore — **novo doc `settings/store`** (dados da empresa). Perfil já tem `termsVersion`/`termsAcceptedAt` (M3). Sem coleções novas.

**Testing**: Vitest 4 + RTL + jsdom. Gate de re-aceite e aceite tocam **auth/perfil** (Princípio II) → testes obrigatórios; hook de meta e helper de versão testados.

**Target Platform**: Web (Firebase Hosting, estático).

**Project Type**: Web app single-frontend, **sem backend**.

**Performance Goals**: meta tags aplicadas no render (sem custo perceptível); `settings/store` com cache de módulo (1 leitura); sitemap gerado no build (zero custo em runtime).

**Constraints**: sem SSR/prerender — crawlers sem JS veem as metas estáticas do `index.html` (limitação aceita, R-1); mudança **aditiva**; **sem mudança de rules/índices** (`settings/{id}` já coberto; aceite escreve no próprio doc do usuário, já permitido).

**Scale/Scope**: catálogo pequeno-médio; 3 documentos legais; 2 páginas institucionais; ~8 rotas com meta.

## Constitution Check

- **I. Code Quality** — PASS. Meta centralizada num hook único (`usePageMeta`); versão/gate num helper puro (`needsTermsReaccept`); conteúdo legal isolado em módulos de conteúdo; sem duplicação de layout (Footer/páginas Legal reusados).
- **II. Testing Standards** — PASS. Aceite de termos (escreve no perfil/auth): testar `needsTermsReaccept` (null/antiga/vigente), `acceptCurrentTerms` (grava versão+data), o gate (bloqueia conta/checkout, libera após aceitar; público livre) e o bloqueio no `useCheckout`.
- **III. UX Consistency** — PASS. Páginas legais/institucionais no layout e tokens existentes; gate de re-aceite com a UI de aceite do M3; Footer segue o design system; `docs/design-system.md` atualizado.
- **IV. Performance** — PASS. `settings/store` em cache de módulo; sem leituras novas por página; sitemap no build; meta sem re-render extra.

Sem violações → Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/017-lancamento-seo-legal/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── services.md   # settings/store, terms helpers, usePageMeta, sitemap build
│   └── ui.md         # rodapé, sobre/contato, páginas legais, gate de re-aceite, admin "Dados da loja"
└── checklists/requirements.md
```

### Source Code (repository root)

```text
frontend/
├── scripts/generate-sitemap.mjs         # NOVO — build: lê produtos ativos (REST pública) → public/sitemap.xml
├── public/robots.txt                    # NOVO — disallow /admin /conta /checkout /login…; aponta o sitemap
├── index.html                           # meta/OG estáticos default da loja (fallback p/ crawlers sem JS)
└── src/
    ├── constants/terms.js               # TERMS_VERSION nova (2026-07-19) + helper needsTermsReaccept(profile)
    ├── constants/routes.js              # + SOBRE, CONTATO, TROCAS, ADMIN_STORE
    ├── content/legal/                   # NOVO — termos.jsx, privacidade.jsx, trocas.jsx (minutas versionadas)
    ├── hooks/
    │   ├── usePageMeta.js               # NOVO — title/description/OG/noindex por página (DOM, sem lib)
    │   └── useStoreSettings.js          # NOVO — settings/store com cache de módulo
    ├── services/
    │   ├── settingsService.js           # + getStoreSettings/updateStoreSettings (doc settings/store)
    │   └── userService.js               # + acceptCurrentTerms(uid) (termsVersion + termsAcceptedAt)
    ├── components/
    │   ├── Footer/index.jsx             # links reais + bloco de dados da empresa (settings/store)
    │   └── TermsGate/index.jsx          # NOVO — gate de re-aceite (renderizado nos guards privados)
    ├── routes/
    │   ├── PrivateRoute.jsx             # envolve filhos com TermsGate (conta + checkout bloqueados)
    │   └── index.jsx                    # rotas /sobre /contato /trocas /admin/loja
    ├── pages/
    │   ├── About/  Contact/             # NOVAS — institucionais (usam settings/store)
    │   ├── Legal/{Terms,Privacy}/       # trocam o placeholder pelo conteúdo real (content/legal)
    │   ├── Legal/Returns/               # NOVA — política de trocas (CDC 7 dias em destaque)
    │   ├── Admin/Store/                 # NOVA — "Dados da loja" (razão social/CNPJ/endereço/contatos)
    │   ├── Checkout/index.jsx           # link p/ política de trocas; gate já cobre via PrivateRoute
    │   └── (Home, Products, Product…)   # usePageMeta em cada rota pública; noindex nas privadas
    └── layouts/AdminLayout/index.jsx    # + item "Dados da loja"
```

**Structure Decision**: single-frontend. Conteúdo legal como módulos de conteúdo versionados (a versão é a `TERMS_VERSION`); o gate vive no `PrivateRoute` (bloqueia exatamente conta + checkout, as duas áreas privadas da loja) e o aceite grava no próprio doc do usuário (permitido pelas rules atuais — **sem deploy de rules**). Sitemap no build via leitura REST pública do catálogo (as rules já permitem ler produto ativo sem auth) — **sem servidor**.

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
