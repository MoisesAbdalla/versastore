# Tasks: Conta do Cliente

**Input**: Design documents from `/specs/007-conta-cliente/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.md, contracts/firestore.md,
quickstart.md

**Tests**: INCLUÍDOS — SC-009 exige a suíte (201) verde + novos; a constituição (Princípio II) torna
NON-NEGOTIABLE testar o cadastro que grava o doc correto, a recuperação neutra, o isolamento dos
pedidos do cliente, os validadores e o CEP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1..US5 — mapeia para as user stories da spec.md
- Caminhos exatos incluídos em cada tarefa

---

## Phase 1: Setup (blocos compartilhados)

- [x] T001 [P] Criar `frontend/src/utils/validation.js`: validadores pt-BR (e-mail, telefone 10–11 dígitos, senha ≥ 8 + `passwordStrength` 0..4, confirmação, CEP) e máscaras de telefone/CEP — testes em `frontend/src/utils/__tests__/validation.test.js` (SC-004)
- [x] T002 [P] Criar `frontend/src/constants/terms.js` (`TERMS_VERSION = "2026-07-13"`) e estender `frontend/src/constants/routes.js` com `RECUPERAR_SENHA`, `COMPLETAR_CADASTRO`, `MINHA_CONTA`, `MEUS_PEDIDOS`, `ENDERECOS`, `TERMOS`, `PRIVACIDADE`
- [x] T003 [P] Criar componentes de formulário da loja em `frontend/src/components/form/`: `FormField` (input rotulado + erro campo a campo, tokens de `variables.css`), `PasswordField` (mostrar/ocultar + indicador de força consumindo `passwordStrength`), `Checkbox` (aceite com links) — cada um com `index.jsx` + `styles.module.css`
- [x] T004 Criar as páginas legais `frontend/src/pages/Legal/Terms/` (`/termos`) e `frontend/src/pages/Legal/Privacy/` (`/privacidade`) com conteúdo **provisório** (aviso claro de substituição no M8) sob o `MainLayout`, e registrar as rotas em `frontend/src/routes/index.jsx` — destino do checkbox de aceite (FR-012c)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: bloqueia as user stories

- [ ] T005 Auditoria de segurança (FR-023) **antes de codar**: no Rules Playground confirmar que o cliente cria/edita o próprio `users/{uid}` (add `phone`/`termsAcceptedAt`/`termsVersion`/`addresses`), é negado ao alterar `role`/`orderCount`/`totalSpent`, lê pedido próprio e é negado em pedido alheio; `git diff firestore.rules` vazio (contracts/firestore.md)
- [x] T006 Estender `frontend/src/services/authService.js` (contracts/services.md): `register({name,email,password,phone,termsAccepted})` (cria Auth user, `updateProfile` displayName, **escrita autoritativa `setDoc(merge)`** do perfil completo com `termsAcceptedAt`+`termsVersion` — NÃO `ensureUserProfile`, por causa da corrida com o `onAuthStateChanged` do AuthContext que pode criar doc com `name:""` antes; o merge garante o nome — I1 do analyze; `email-already-in-use` → `email-em-uso`), `loginWithGoogle()` (`signInWithPopup`, garante doc com `authProvider:"google"`), `resetPassword(email)` (**não lança** em `auth/user-not-found` — neutro) — testes em `frontend/src/services/__tests__/authService.test.js` (displayName+doc via merge mesmo com doc pré-existente name-vazio; email-em-uso; reset neutro; google authProvider)
- [x] T007 Estender `frontend/src/services/userService.js` (contracts/services.md): `ensureUserProfile(user, extra)` (aceita phone/termsAcceptedAt/termsVersion/authProvider), `getFullProfile(uid)`, `completeProfile(uid,{phone})` (grava phone+`termsAcceptedAt`+`termsVersion`), `isProfileComplete(profile)`, e CRUD de endereços `listAddresses`/`saveAddress`/`removeAddress`/`setDefaultAddress` (um `isDefault` por vez) — testes em `frontend/src/services/__tests__/userService.test.js` (isProfileComplete; completeProfile grava versão; endereço mantém 1 padrão)
- [x] T008 Estender `frontend/src/contexts/AuthContext.jsx`: após `onAuthStateChanged`, carregar `getFullProfile` e expor `profile`, `profileIncomplete` (`!isProfileComplete`), `reloadProfile()` — mantendo `user`/`role`/`isAdmin`/`loading` — testes em `frontend/src/contexts/__tests__/AuthContext.profile.test.jsx` (profileIncomplete true sem phone/termos)

**Checkpoint**: auth/perfil/validação/legais prontos — as telas podem ser construídas

---

## Phase 3: User Story 1 - Telas de autenticação definitivas (Priority: P1) 🎯 MVP

**Goal**: `/login` e `/register` redesenhadas no padrão do site, validação campo a campo, sem `alert`.

**Independent Test**: quickstart §1 — visual no padrão, erro no próprio campo em pt-BR, 375px sem
scroll horizontal, navegação login↔cadastro + link recuperar.

- [x] T009 [US1] Criar `frontend/src/hooks/useAuthForm.js`: estado + validação campo a campo (usa `utils/validation`), `touched`/`errors`, `validateAll` — testes em `frontend/src/hooks/__tests__/useAuthForm.test.jsx` (valida por campo; bloqueia submit inválido)
- [x] T010 [US1] Redesenhar `frontend/src/pages/Login/index.jsx` + `styles.module.css`: e-mail/senha com `FormField`/`PasswordField`, erros campo a campo, link "esqueci minha senha" e link para cadastro, sob `MainLayout`, responsivo — sem `alert`
- [x] T011 [US1] Redesenhar `frontend/src/pages/Register/index.jsx` + `styles.module.css`: nome, e-mail, senha+confirmação (força), telefone (máscara), `Checkbox` de aceite com links para `/termos` e `/privacidade`; validação campo a campo; botão só habilita com tudo válido + termos aceitos — submete via `authService.register` (T006)

**Checkpoint**: telas de auth definitivas e validadas — MVP visual demonstrável

---

## Phase 4: User Story 2 - Cadastro completo e Google criando o cliente (Priority: P1)

**Goal**: cadastro grava o cliente correto (fecha a raiz do bug de nome); Google + "Complete seu
cadastro" garantem paridade de dados.

**Independent Test**: quickstart §2 e §3 — cadastrar e conferir `users/{uid}` completo + displayName;
buscar o cliente por nome no admin; entrar por Google → completar telefone/aceite.

- [x] T012 [US2] Adicionar "Entrar com Google" em `Login` e `Register` (componente compartilhado `frontend/src/components/form/GoogleButton/`) chamando `authService.loginWithGoogle`; após login, se `profileIncomplete`, redirecionar a `/completar-cadastro`
- [x] T013 [US2] Criar `frontend/src/pages/CompleteProfile/index.jsx` + `styles.module.css` (`/completar-cadastro`): coleta telefone + aceite de termos (links legais), chama `userService.completeProfile` e `reloadProfile`; acessível só logado
- [x] T014 [US2] Criar o guard de cadastro incompleto `frontend/src/routes/CompleteProfileGuard.jsx` (se `profileIncomplete`, deixa passar; se completo, redireciona à home; anônimo → login) aplicado à rota `/completar-cadastro` — teste em `frontend/src/routes/__tests__/CompleteProfileGuard.test.jsx`
- [x] T015 [US2] Teste de integração do cadastro em `frontend/src/pages/Register/__tests__/register-flow.test.jsx`: cadastro por e-mail cria doc completo com nome/displayName (SC-002) e bloqueia sem aceite dos termos

**Checkpoint**: todo cliente nasce completo (nome + telefone + aceite versionado), por e-mail ou Google

---

## Phase 5: User Story 3 - Recuperação de senha (Priority: P2)

**Goal**: redefinição por e-mail com resposta neutra.

**Independent Test**: quickstart §4 — solicitar redefinição para e-mail cadastrado e inexistente e
ver a **mesma** confirmação; erro de rede mostra "tentar novamente".

- [x] T016 [US3] Criar `frontend/src/pages/ForgotPassword/index.jsx` + `styles.module.css` (`/recuperar-senha`): campo de e-mail, chama `authService.resetPassword`, mostra **sempre** a mesma confirmação (neutra, SC-005), erro real → "tentar novamente"; link a partir do `/login` — teste em `frontend/src/pages/ForgotPassword/__tests__/forgot-password.test.jsx` (resposta neutra + bloqueio com e-mail inválido)

**Checkpoint**: cliente recupera acesso sem suporte, sem vazar existência de conta

---

## Phase 5.5: Área de conta e ajustes de escopo (M3.1) 🔁 cross-cutting

**Goal**: dar um lar navegável e coerente à conta do cliente (menu do header + página com abas) e
fechar a regressão do carrinho por identidade — pré-requisitos de US4/US5 que não estavam em nenhuma
user story (levantados no teste manual do bloco US1–US3).

**Decisões** (registradas em `plan.md` › "Decisões de escopo M3.1"):
- **Conta com abas**: uma página `/conta` com layout único (`AccountLayout`) e abas Dados/Pedidos/
  Endereços — em vez de três páginas soltas. US4 preenche a aba Pedidos; US5 a aba Endereços; a Lista
  de Desejos entra como 4ª aba na Fase C. Rotas: `/conta` (Dados), `/conta/pedidos`, `/conta/enderecos`.
- **Carrinho por identidade**: chave `versastore:cart:<uid>` (`:guest` p/ anônimo). Login **mescla** o
  carrinho do visitante ao salvo do usuário (soma travada no estoque) e limpa a chave do visitante;
  logout recarrega a chave do visitante (sessão limpa) preservando o carrinho salvo do usuário.

- [x] T026 Área de conta: `frontend/src/layouts/AccountLayout/` (MainLayout + abas via `NavLink` + `Outlet`) e rotas aninhadas `/conta` sob `PrivateRoute` em `frontend/src/routes/index.jsx` (`CONTA`, `CONTA_PEDIDOS`, `CONTA_ENDERECOS` em `routes.js`)
- [x] T027 Menu do usuário no header: `frontend/src/components/UserMenu/` (dropdown: Minha conta, Meus pedidos, Meus endereços, **separador**, Sair; item **Painel admin** quando `isAdmin`; fecha em clique-fora/Esc; extensível p/ Lista de Desejos) substituindo o botão de logout em `frontend/src/components/Header/index.jsx` — teste em `frontend/src/components/UserMenu/__tests__/UserMenu.test.jsx`
- [x] T028 Aba "Meus dados": `frontend/src/pages/Account/PersonalData/` (edita nome+telefone via `userService.updatePersonalData` — mantém `nameLower`/displayName; e-mail somente leitura; "alterar senha" por e-mail de redefinição reusando `resetPassword`); `FormField` ganha `disabled`/`hint`
- [x] T029 **Fix regressão M2** — carrinho isolado por identidade em `frontend/src/contexts/CartContext.jsx` (chave por `uid`, merge no login, sessão limpa no logout) — testes de troca de conta/logout/merge em `frontend/src/contexts/__tests__/CartContext.test.jsx`

**Checkpoint**: usuário navega pela conta a partir do header; trocar de conta na aba não vaza carrinho

---

## Phase 6: User Story 4 - Meus pedidos (Priority: P2)

**Goal**: cliente vê e detalha os próprios pedidos; nunca os de outro.

**Independent Test**: quickstart §5 — lista dos próprios pedidos, detalhe, estado vazio, e bloqueio
de pedido alheio por URL.

- [x] T017 [US4] Estender `frontend/src/services/orderService.js`: `listMyOrders(uid,{pageSize,cursor})` (`customerId==uid`, recentes, cursor — reusa índice existente) e `getMyOrder(id,uid)` (retorna `null` se `customerId !== uid`) — estender `frontend/src/services/__tests__/orderService.test.js` (getMyOrder → null para outro uid — SC-006)
- [x] T018 [P] [US4] Criar `frontend/src/hooks/useMyOrders.js` (paginação por cursor do cliente logado)
- [x] T019 [US4] Criar a aba de pedidos `frontend/src/pages/Account/Orders/index.jsx` (lista: nº, data, status, valor) e o detalhe `frontend/src/pages/Account/Orders/Detail/index.jsx` (itens com preço do momento, endereço, status, rastreio) + `styles.module.css`; estados carregando/vazio/erro; rota índice em `/conta/pedidos` e detalhe `/conta/pedidos/:id` sob o `AccountLayout`/`PrivateRoute`

**Checkpoint**: acompanhamento de pedidos do cliente, isolado por conta

---

## Phase 7: User Story 5 - Endereços com CEP (Priority: P2)

**Goal**: CRUD de endereços com preenchimento por CEP e endereço padrão.

**Independent Test**: quickstart §6 — CEP válido preenche; CEP inválido/serviço fora cai para
manual; marcar padrão (um só); editar/remover.

- [x] T020 [P] [US5] Criar `frontend/src/services/cepService.js`: `lookupCep(cep)` via ViaCEP (`fetch` com timeout ~5s; CEP inválido/não encontrado/timeout → `null`) — testes em `frontend/src/services/__tests__/cepService.test.js` (mapeia campos no sucesso; `null` em erro/timeout — SC-007)
- [x] T021 [US5] Criar a aba de endereços `frontend/src/pages/Account/Addresses/index.jsx` + `styles.module.css` (rota `/conta/enderecos`, sob o `AccountLayout`/`PrivateRoute`): lista de endereços, formulário com CEP (preenche rua/bairro/cidade/UF; fallback manual em falha), número/complemento manuais, marcar padrão, editar/remover — via `userService` (T007); estados carregando/vazio/erro

**Checkpoint**: endereços prontos para o checkout (M4) usar como entrega

---

## Phase 8: Polish & Cross-Cutting

- [ ] T022 [P] Atualizar `docs/design-system.md` com o padrão de formulários da loja (`FormField`, `PasswordField`/força, `Checkbox` de aceite) e as telas de auth/conta (login, cadastro, completar cadastro, recuperar senha, meus pedidos, endereços)
- [ ] T023 Auditoria responsiva (375px) das telas de auth e conta (SC-008) e de acessibilidade (labels associados aos inputs, foco/Esc nos formulários)
- [ ] T024 Gates finais: `npm run lint` (zero erros), `npm run test` (201 baseline + novos verdes — SC-009), `npm run build` (bundle da loja íntegro)
- [ ] T025 Executar a validação completa do quickstart.md (§0–7), incluindo habilitar o provedor Google no console e a regressão de Home/vitrine/carrinho/admin

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T004 em paralelo (T004 depende de rotas; independe do resto)
- **Foundational (Phase 2)**: T006/T007 dependem de T001/T002; T008 depende de T007. **Bloqueia as user stories**
- **US1 (Phase 3)**: depende de Setup (validation, form) + T006 (register); T009 antes de T010/T011
- **US2 (Phase 4)**: depende de US1 + T006/T007/T008 (Google/perfil); T012→T013→T014→T015
- **US3 (Phase 5)**: depende de T006 (resetPassword) + US1 (link no login)
- **US4 (Phase 6)**: depende de T017 (service) + `PrivateRoute`; T018 ∥ T017, T019 por último
- **US5 (Phase 7)**: depende de T007 (endereços) + T020 (cep); T020 ∥ enquanto T021 avança
- **Polish (Phase 8)**: depende das stories desejadas

### Ordem recomendada (MVP-first)

Setup → Foundational → **US1 → US2** (telas definitivas + cliente completo, ambos P1) → US3 → US4 →
US5 → Polish.

### Parallel Opportunities

- Phase 1: T001 ∥ T002 ∥ T003 (T004 após rotas)
- Phase 2: T006 ∥ T007 (arquivos distintos); T008 depois de T007
- US4: T018 ∥ T017; US5: T020 ∥ T021

## Implementation Strategy

### MVP (US1 + US2)

1. Phases 1–2 (validação, form, legais, authService/userService/AuthContext)
2. Phase 3 (US1) → validar quickstart §1
3. Phase 4 (US2) → validar quickstart §2/§3 — **cliente completo por e-mail e Google** (fecha a raiz
   do bug de nome)

### Incremental Delivery

US1 (telas) → US2 (cadastro/Google) → US3 (recuperar senha) → US4 (meus pedidos) → US5 (endereços) →
Polish. Home/vitrine/carrinho/admin intactos em cada incremento (T025 verifica).

## Notes

- Nenhuma dependência nova; nenhuma escrita pública nova além do próprio `users/{uid}`;
  `firestore.rules` não muda (auditado em T005); nenhum índice novo (meus pedidos reusa
  `customerId+createdAt`).
- Aceite de termos grava **data + versão** (`termsAcceptedAt` + `termsVersion` de `TERMS_VERSION`),
  base para re-solicitar aceite quando os textos mudarem no M8.
- Passo operacional (não é deploy de código): habilitar o provedor Google no console do Firebase
  (quickstart §pré-requisitos / §3).
- Commit ao fim de cada fase/checkpoint; parar em cada checkpoint para validar a story.
