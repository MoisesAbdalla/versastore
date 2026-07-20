# Tasks: Bloco de Lançamento — SEO, Institucional e Legal (017 / M8)

**Input**: Design documents from `/specs/017-lancamento-seo-legal/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.md, contracts/ui.md, quickstart.md, research.md

**Tests**: INCLUÍDOS — o aceite de termos toca o **perfil/auth** (Princípio II): helper de versão, gravação do aceite, gate bloqueia/libera, meta hook.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 [P] `frontend/src/constants/routes.js`: + `SOBRE:"/sobre"`, `CONTATO:"/contato"`, `TROCAS:"/trocas"`, `ADMIN_STORE:"/admin/loja"`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 [P] `frontend/src/constants/terms.js`: `TERMS_VERSION = "2026-07-19"` + `needsTermsReaccept(profile)` — testes em `frontend/src/constants/__tests__/terms.test.js` (null→true; antiga→true; vigente→false; profile null→false)
- [x] T003 [P] `frontend/src/services/userService.js`: + `acceptCurrentTerms(uid)` — estender `frontend/src/services/__tests__/userService.test.js` (grava versão vigente + timestamp)
- [x] T004 [P] `frontend/src/services/settingsService.js`: + `getStoreSettings`/`updateStoreSettings` (doc `settings/store`, default campos vazios) e `frontend/src/hooks/useStoreSettings.js` (cache de módulo)
- [x] T005 [P] `frontend/src/hooks/usePageMeta.js`: title/description/OG/noindex via DOM, restaura ao desmontar — teste em `frontend/src/hooks/__tests__/usePageMeta.test.js`

**Checkpoint**: versão/aceite, dados da loja e meta prontos e testados

---

## Phase 3: User Story 1 - Legal + re-aceite (Priority: P1) 🎯 MVP

- [x] T006 [US1] Criar `frontend/src/content/legal/termos.jsx`, `privacidade.jsx` e `trocas.jsx`: minutas completas pt-BR (e-commerce BR; LGPD; CDC art. 49 com bloco de 7 dias destacado em trocas; prazos de defeito art. 26), adaptadas à operação (Pix/cartão/boleto, frete tabela + retirada, cupons, avaliações moderadas, conta), com versão vigente e aviso de minuta
- [x] T007 [US1] Atualizar `frontend/src/pages/Legal/Terms` e `Legal/Privacy` para renderizar o conteúdo real; criar `frontend/src/pages/Legal/Returns` (/trocas) com o mesmo padrão; registrar a rota `/trocas` em `frontend/src/routes/index.jsx`
- [x] T008 [US1] Criar `frontend/src/components/TermsGate/index.jsx` + styles (contracts/ui.md): tela de re-aceite (links + checkbox + aceitar → `acceptCurrentTerms` + `reloadProfile`; estados salvando/erro) — testes em `frontend/src/components/__tests__/TermsGate.test.jsx` (deslogado→children; antiga→gate; aceita→libera; vigente→children)
- [x] T009 [US1] `frontend/src/routes/PrivateRoute.jsx`: envolver os filhos com `TermsGate` (bloqueia /conta/* e /checkout*); `frontend/src/pages/Checkout/index.jsx`: linha "Ao confirmar, você concorda com os [Termos] e a [Política de trocas]…" antes do confirmar

**Checkpoint**: textos reais publicados; conta antiga re-aceita; compra sob a versão vigente

---

## Phase 4: User Story 2 - Institucional (Priority: P1)

- [x] T010 [US2] Criar `frontend/src/pages/Admin/Store/index.jsx` + styles: campos razão social/CNPJ (máscara)/endereço/e-mail/telefone/WhatsApp + aviso de pendência; salvar via `updateStoreSettings`; rota `/admin/loja` (lazy) + item "Dados da loja" no `AdminLayout`
- [x] T011 [US2] Atualizar `frontend/src/components/Footer/index.jsx`: links reais (Sobre/Contato/Termos/Privacidade/Trocas/Meus pedidos via ROUTES; corrigir `/privacy`), bloco de identificação (razão social · CNPJ · endereço · contato de `useStoreSettings`, vazios omitidos)
- [x] T012 [P] [US2] Criar `frontend/src/pages/About/index.jsx` (/sobre) e `frontend/src/pages/Contact/index.jsx` (/contato) + styles (MainLayout; Contato usa canais de settings/store: mailto/wa.me/tel; estado vazio) + rotas

**Checkpoint**: identificação do fornecedor visível; institucionais no ar

---

## Phase 5: User Story 3 - SEO (Priority: P2)

- [x] T013 [US3] Aplicar `usePageMeta` nas rotas: Home, Products (com categoria/busca), Product (nome/descrição/og:image), Cart, Sobre/Contato/Termos/Privacidade/Trocas (títulos próprios) e **noindex** em Checkout/Success, Conta (AccountLayout), Login/Register/ForgotPassword/CompleteProfile, AdminLayout, AccessDenied
- [x] T014 [P] [US3] `frontend/index.html`: title/description/OG/twitter default da loja (fallback p/ crawlers sem JS)
- [x] T015 [P] [US3] Criar `frontend/public/robots.txt` (Disallow /admin /conta /checkout /login /register /recuperar-senha /completar-cadastro /acesso-negado + Sitemap) e `frontend/scripts/generate-sitemap.mjs` (REST pública runQuery status==ativo&&deleted==false → public/sitemap.xml; falha → mantém e avisa) + `"prebuild"` no `frontend/package.json`

**Checkpoint**: páginas com meta própria; sitemap/robots publicáveis

---

## Phase 6: Polish & Cross-Cutting

- [x] T016 [P] Atualizar `docs/design-system.md` (seção Lançamento: rodapé com identificação, institucionais, legais + gate, meta por rota)
- [x] T017 Gates finais: `npm run lint`, `npm run test`, `npm run build` (sitemap gerado no build)
- [ ] T018 Regressão do quickstart (§1–4) — **validação manual do usuário** (inclui preencher Dados da loja e revisar as minutas legais)

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T005, paralelos) → US1 (T006→T007; T008 depois de T002/T003; T009 depois de T008) → US2 (T010 ∥ T012; T011 depois de T004) → US3 (T013 depois de T005; T014/T015 paralelos) → Polish.
- US2 e US3 independentes entre si após o Foundational.

## Notes
- **Sem deploy de rules/índices**. Novo doc `settings/store`.
- `TERMS_VERSION` "2026-07-13" → **"2026-07-19"**; cadastros novos já gravam a vigente (fluxos existentes usam a constante).
- Limitação OG de produto p/ crawlers sem JS documentada (R-1) — resolve com servidor (pós-Blaze).
- Minutas legais = revisão do lojista/advogado antes do ar.
