# Contracts: Services e Auth da Conta do Cliente

**Feature**: 007-conta-cliente | **Date**: 2026-07-13

Regras gerais: componentes/páginas consomem services e o `AuthContext`, nunca `firebase/*` direto
(exceto os wrappers de service). Erros do Firebase Auth são traduzidos para mensagens pt-BR campo a
campo. Escrita só no próprio `users/{uid}`.

## authService.js (estender)

| Função | Assinatura | Notas |
|---|---|---|
| `register` | `({name, email, password, phone, termsAccepted}) → user` | cria o Auth user, `updateProfile({displayName: name})`, e faz **escrita autoritativa** do perfil completo via `setDoc(merge)` — `name`, `nameLower`, `email`, `phone`, `termsAcceptedAt` = agora, `termsVersion` = `TERMS_VERSION`, `authProvider: "password"`. **Não** usar `ensureUserProfile` (create-if-absent) aqui: o `onAuthStateChanged` do AuthContext pode criar um doc com `name: ""` **antes** deste write; o merge autoritativo garante o nome independentemente da ordem (evita regredir o bug de nome — FR-009/SC-002). Erro `auth/email-already-in-use` → `email-em-uso` |
| `login` | `(email, password) → user` | existente |
| `loginWithGoogle` | `() → user` | `signInWithPopup(GoogleAuthProvider)`; garante `users/{uid}` (nome/e-mail do Google, `authProvider: "google"`) via userService |
| `resetPassword` | `(email) → void` | `sendPasswordResetEmail`; **nunca** lança para `auth/user-not-found` (resposta neutra, SC-005); outros erros propagam p/ "tentar novamente" |
| `logout` | `() → void` | existente |

## userService.js (estender)

| Função | Assinatura | Notas |
|---|---|---|
| `ensureUserProfile` | `(user, extra?) → profile` | existente, estendido: aceita `{phone, termsAcceptedAt, termsVersion, authProvider}`; **cria com defaults se ausente** (não sobrescreve doc existente). Usado pelo AuthContext/Google; o cadastro por e-mail usa a escrita autoritativa do `register` (ver acima) — os dois convergem para o doc com nome |
| `getFullProfile` | `(uid) → profile \| null` | doc completo (name, email, phone, termsAcceptedAt, authProvider, addresses, role) — usado pelo AuthContext |
| `completeProfile` | `(uid, {phone}) → void` | grava telefone + aceite (`termsAcceptedAt` = agora, `termsVersion` = `TERMS_VERSION`) no passo pós-Google / completar cadastro |
| `isProfileComplete` | `(profile) → boolean` | `Boolean(profile?.phone) && profile?.termsAcceptedAt != null` |
| `listAddresses` | `(uid) → Endereço[]` | do `users.addresses` |
| `saveAddress` | `(uid, address) → void` | cria/atualiza pelo `id`; se `isDefault`, zera o default dos demais (só um por vez) |
| `removeAddress` | `(uid, addressId) → void` | remove do array |
| `setDefaultAddress` | `(uid, addressId) → void` | marca um como padrão, desmarca os outros |
| `getUserProfile`, `hasPermission` | existentes | inalterados |

Todas as escritas de `users` são `updateDoc`/`setDoc(merge)` do próprio uid — nunca tocam
`role`/`orderCount`/`totalSpent` (rule).

## orderService.js (estender — leitura do próprio cliente)

| Função | Assinatura | Notas |
|---|---|---|
| `listMyOrders` | `(uid, {pageSize=10, cursor}) → {items, nextCursor, hasMore}` | `where customerId == uid, orderBy createdAt desc`; reusa índice existente |
| `getMyOrder` | `(id, uid) → Order \| null` | lê o pedido e confirma `customerId === uid`; senão `null` (não vaza pedido alheio — a rule já nega, o service reforça) |

As funções de admin (`listOrders`, `advanceStatus`, transações) permanecem inalteradas.

## cepService.js (novo)

| Função | Assinatura | Notas |
|---|---|---|
| `lookupCep` | `(cep) → {rua, bairro, cidade, uf} \| null` | ViaCEP `https://viacep.com.br/ws/{cep}/json/` via `fetch` com timeout (~5s); CEP inválido/não encontrado/timeout → `null` (a UI cai para preenchimento manual, SC-007) |

Sem chave/autenticação (serviço público). URL externa isolada aqui.

## AuthContext.jsx (estender)

Expõe, além de `{ user, setUser, role, isAdmin, loading }`:

| Membro | Tipo | Notas |
|---|---|---|
| `profile` | objeto \| null | perfil completo do `users/{uid}` (nome, phone, addresses, …) |
| `profileIncomplete` | boolean | `user` existe mas `isProfileComplete(profile)` é falso (Google recém-entrado ou conta legada) |
| `reloadProfile` | `() → void` | recarrega o perfil após completar cadastro / editar dados |

Carrega o perfil via `getFullProfile` após `onAuthStateChanged` (uma leitura por login).

## hooks

| Hook | Retorno |
|---|---|
| `useAuthForm(schema)` | `{ values, errors, touched, setField, validateField, validateAll, isValid }` — validação campo a campo (utils/validation) |
| `useMyOrders()` | `{ items, loading, error, hasMore, loadMore }` — pedidos do próprio cliente |

## Testes obrigatórios (constituição II + SC)

- `authService.register`: grava displayName + doc completo; `email-already-in-use` → `email-em-uso`
  (SC-002).
- `authService.resetPassword`: **não** lança em `auth/user-not-found` (resposta neutra, SC-005);
  propaga outros erros.
- `authService.loginWithGoogle`: garante `users/{uid}` com `authProvider: "google"`.
- `userService.isProfileComplete` / `completeProfile`: completo só com phone + termos; completar
  grava `phone`, `termsAcceptedAt` **e** `termsVersion` (SC — versão registrada).
- `userService` endereços: `saveAddress`/`setDefaultAddress` mantêm **um** padrão; remove funciona.
- `orderService.getMyOrder`: retorna `null` para pedido de outro `uid` (SC-006).
- `cepService.lookupCep`: sucesso mapeia campos; erro/timeout/CEP inexistente → `null` (SC-007).
- `utils/validation`: e-mail, telefone, senha (força/mínimo), confirmação, CEP (SC-004).
- `AuthContext`: `profileIncomplete` true para conta sem phone/termos.
