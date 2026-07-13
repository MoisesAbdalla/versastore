# Implementation Plan: Conta do Cliente

**Branch**: `007-conta-cliente` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-conta-cliente/spec.md`

## Summary

Entregar a área de conta do cliente e as telas de autenticação definitivas, estendendo a
infraestrutura de auth já existente (Firebase Auth + `AuthContext` + `authService`/`userService` +
`PrivateRoute`), sem backend e sem dependências novas. Redesenho de `/login` e `/register` no padrão
do design system (componentes de formulário próprios com os tokens de `variables.css`, validação
campo a campo — fim do `alert()`); cadastro completo (nome, e-mail, senha+confirmação com força,
telefone, aceite de termos) gravando `users/{uid}` no formato que o admin já lê e definindo o
`displayName`; login com Google (`signInWithPopup`) com passo "Complete seu cadastro" na primeira
entrada para telefone + aceite (paridade de dados); recuperação de senha (`sendPasswordResetEmail`,
resposta neutra); "meus pedidos" (leitura dos próprios pedidos, já permitida pelas rules); e
endereços no `users/{uid}.addresses` com busca por CEP (ViaCEP via `fetch`, com fallback manual).
Nenhuma escrita pública nova além do próprio documento do usuário; `firestore.rules` não muda.

## Technical Context

**Language/Version**: JavaScript (ES Modules + JSX), sem TypeScript

**Primary Dependencies**: React 19.2, Vite 8.1, React Router DOM 7.18, Firebase SDK 12.15 (Auth +
Firestore), MUI 9.2 (usado pontualmente onde já é padrão). **Nenhuma dependência nova** — validação
de formulário, indicador de força de senha e consulta de CEP são código próprio (ViaCEP por `fetch`)

**Storage**: Cloud Firestore (`users/{uid}` — escrita do próprio doc; `orders` — leitura dos
próprios). Firebase Auth (e-mail/senha já ativo; **Google a habilitar no console** — passo
operacional). Nenhuma escrita pública nova

**Testing**: Vitest 4 + React Testing Library + jsdom; Firestore/Auth mockados nos services (padrão
da 003/005). Linha de base a preservar: 201 testes verdes (SC-009)

**Target Platform**: Web responsivo (desktop + mobile, ≥ 375px)

**Performance Goals**: telas de conta interativas < 3s (constituição IV); "meus pedidos" paginado por
cursor; CEP é uma leitura externa pontual com timeout e fallback

**Constraints**: sem escrita pública nova nas rules (auditar); sem dependências novas; não quebrar
Home/vitrine/admin; textos pt-BR; validação campo a campo (nunca `alert`); aceite de termos e
telefone obrigatórios nos dois métodos de entrada; resposta neutra na recuperação de senha (não vaza
existência de conta)

**Scale/Scope**: ~6 telas novas/redesenhadas (login, cadastro, completar cadastro, recuperar senha,
meus pedidos lista+detalhe, endereços); extensão de 2 services + 1 novo (cep); extensão do
`AuthContext` com o perfil e o flag de cadastro incompleto

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|---|---|---|
| I. Code Quality | oxlint; componentes de formulário pequenos e reutilizáveis (FormField, PasswordField); nomes do domínio (`User`, `Address`, `Order`); sem `alert` | PASS |
| II. Testing | NON-NEGOTIABLE por SC: cadastro grava o doc correto e o `displayName` (SC-002), validações campo a campo (SC-004), recuperação neutra (SC-005), cliente só vê os próprios pedidos (SC-006), CEP preenche/faz fallback (SC-007). Auth/Firestore mockados, determinístico | PASS |
| III. UX Consistency | tokens de `variables.css`/design system; `docs/design-system.md` atualizado no mesmo PR com o padrão de formulários da loja (FormField, força de senha, telas de auth/conta); loading/erro/vazio em toda tela | PASS |
| IV. Performance | leituras com escopo (meus pedidos por cursor; perfil carregado uma vez no `AuthContext`); CEP com timeout; sem varredura | PASS |

**Violações**: nenhuma. Complexity Tracking não se aplica.

**Re-check pós-Fase 1**: mantido PASS — sem dependência nova, sem escrita pública nova (só o próprio
`users/{uid}`), sem mudança de rules. O único recurso externo novo é a leitura do ViaCEP (público,
com fallback).

## Project Structure

### Documentation (this feature)

```text
specs/007-conta-cliente/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — decisões (Google onboarding, CEP, validação, perfil incompleto)
├── data-model.md        # Fase 1 — users (phone, termsAcceptedAt, authProvider), addresses
├── quickstart.md        # Fase 1 — validação ponta a ponta (inclui habilitar Google no console)
├── contracts/
│   ├── services.md      # authService/userService/orderService (cliente)/cepService
│   └── firestore.md     # Auditoria de rules (sem mudança)
└── tasks.md             # Fase 2 — /speckit-tasks (não por este comando)
```

### Source Code (repository root)

```text
frontend/src/
├── components/
│   └── form/
│       ├── FormField/           # NOVO — input rotulado com erro campo a campo (tokens da loja)
│       ├── PasswordField/       # NOVO — senha com mostrar/ocultar + indicador de força
│       └── Checkbox/            # NOVO — aceite de termos (link p/ termos/privacidade — placeholder M8)
├── contexts/
│   └── AuthContext.jsx          # ESTENDER — expor `profile` completo e `profileIncomplete`
│                                #   (telefone/aceite ausentes); manter user/role/isAdmin/loading
├── hooks/
│   ├── useAuthForm.js           # NOVO — estado + validação campo a campo (reutilizável login/cadastro)
│   └── useMyOrders.js           # NOVO — pedidos do próprio cliente (cursor)
├── pages/
│   ├── Login/                   # REDESENHAR — e-mail/senha + "Entrar com Google" + link recuperar
│   ├── Register/                # REDESENHAR — cadastro completo (nome, e-mail, senha+conf, telefone, termos)
│   ├── CompleteProfile/         # NOVO — passo "Complete seu cadastro" (telefone + aceite) pós-Google
│   ├── ForgotPassword/          # NOVO — solicitar redefinição (resposta neutra)
│   ├── Account/
│   │   ├── Orders/              # NOVO — lista + detalhe dos próprios pedidos
│   │   └── Addresses/           # NOVO — CRUD de endereços com CEP
│   └── ...                      # Home/vitrine/admin inalterados
├── services/
│   ├── authService.js           # ESTENDER — register(dados completos + displayName), loginWithGoogle,
│   │                            #   resetPassword; login/logout já existem
│   ├── userService.js           # ESTENDER — ensureUserProfile(dados), completeProfile,
│   │                            #   getFullProfile, isProfileComplete, address CRUD (users.addresses)
│   ├── orderService.js          # ESTENDER — listMyOrders(uid, cursor)/getMyOrder(id, uid) (cliente)
│   └── cepService.js            # NOVO — lookupCep(cep) via ViaCEP (fetch, timeout, fallback)
├── utils/
│   └── validation.js            # NOVO — validadores pt-BR (e-mail, telefone, senha, força) + máscaras
├── routes/
│   ├── index.jsx                # ESTENDER — /recuperar-senha, /completar-cadastro, /minha-conta/*
│   │                            #   (conta sob PrivateRoute); /login e /register já existem
│   └── PrivateRoute.jsx         # REUSAR — guard de sessão (já implementado na 003)
└── constants/
    └── routes.js                # ESTENDER — rotas de conta
```

**Structure Decision**: mantém o projeto único em `frontend/`. As telas de auth/conta vivem sob o
`MainLayout` da loja (não o AdminLayout). O `AuthContext` é **estendido** (não substituído) para
expor o perfil completo e o flag de cadastro incompleto — os consumidores atuais (`user`, `role`,
`isAdmin`) seguem intactos. Os services de auth/usuário são estendidos; o `orderService` ganha
funções de leitura do próprio cliente (as de admin permanecem). Único service novo é o `cepService`.
Nenhum arquivo fora de `frontend/` muda (rules e índices inalterados — auditado no contracts).

## Decisões de arquitetura (resumo — detalhes em research.md)

| # | Tema | Decisão |
|---|---|---|
| R-1 | Cadastro grava o cliente | `register({name, email, password, phone, termsAccepted})` cria o Auth user, define `displayName`, e grava `users/{uid}` completo (fecha a raiz do bug de nome — FR-009) |
| R-2 | Login com Google | `signInWithPopup(GoogleAuthProvider)`; primeira entrada cria `users/{uid}` com nome/e-mail do Google, `authProvider: "google"`, **sem** phone/termos → `profileIncomplete` |
| R-3 | Cadastro incompleto | Perfil é completo quando `phone` E `termsAcceptedAt` presentes; `AuthContext` expõe `profileIncomplete`; um guard leva ao `/completar-cadastro` antes da área de conta/checkout |
| R-4 | Recuperação de senha | `sendPasswordResetEmail`; a UI mostra **sempre** a mesma confirmação (mesmo para e-mail inexistente/erro `auth/user-not-found`) — não vaza existência (SC-005) |
| R-5 | Validação | `utils/validation.js` compartilhado (e-mail, telefone, senha ≥ 8 + força, confirmação); erros campo a campo via `FormField`; `useAuthForm` orquestra estado/validação |
| R-6 | Meus pedidos | `orderService.listMyOrders(uid)` = `where customerId == uid, orderBy createdAt desc` (reusa índice `orders customerId+createdAt` da 003); rules garantem só os próprios (SC-006) |
| R-7 | Endereços | `users.addresses[]` editado pelo próprio usuário (rule já permite); um `isDefault` por vez (o service normaliza) |
| R-8 | CEP | `cepService.lookupCep` via ViaCEP (`fetch`), com timeout e tratamento de "CEP não encontrado"; falha → preenchimento manual, nunca bloqueia (SC-007) |
| R-9 | Rules | Auditoria confirma: usuário cria/edita o próprio `users/{uid}` (exceto `role`/`orderCount`/`totalSpent`), lê os próprios `orders` — **sem mudança** em `firestore.rules` |
| R-10 | Google no console | Habilitar o provedor Google no Firebase (Authentication → Sign-in method) é passo operacional do lojista (quickstart) |

## Complexity Tracking

Sem violações da constituição — seção não aplicável.
