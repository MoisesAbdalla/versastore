# Quickstart: Validação da Conta do Cliente

**Feature**: 007-conta-cliente | **Date**: 2026-07-13

Referências: [data-model.md](./data-model.md), [contracts/services.md](./contracts/services.md),
[contracts/firestore.md](./contracts/firestore.md).

## Pré-requisitos

```powershell
cd C:\VersaStore\frontend
npm install
npm run dev        # loja + painel em http://localhost:5173
```

- **Habilitar o Google** (uma vez): Firebase Console → Authentication → Sign-in method → **Google**
  → Enable (definir o e-mail de suporte do projeto). `localhost` já é domínio autorizado para dev.
- Um pedido de exemplo associado a um cliente (via seed da 003) para validar "meus pedidos".

## Gates automatizados

```powershell
cd C:\VersaStore\frontend
npm run lint       # oxlint — zero erros
npm run test       # Vitest — 201 baseline + novos (SC-009)
npm run build      # bundle íntegro
```

## 0. Auditoria de segurança (FR-023) — antes de codar

| Passo (Rules Playground) | Esperado |
|---|---|
| cliente autenticado `update /users/{seu-uid}` add `phone`/`termsAcceptedAt`/`addresses` | **Allow** |
| cliente `update /users/{seu-uid}` com `role: "admin"` | **Deny** |
| cliente `get /orders/{pedido-proprio}` | **Allow** |
| cliente `get /orders/{pedido-de-outro}` | **Deny** |
| `git diff firestore.rules` | **Sem alterações** |

## 1. Telas de autenticação redesenhadas (US1)

| Passo | Esperado |
|---|---|
| Abrir `/login` e `/register` | Visual no padrão da loja (tokens, tipografia), sob o MainLayout; 375px sem scroll horizontal |
| Submeter com e-mail malformado | Erro **no campo** de e-mail, em pt-BR (sem `alert`) |
| Alternar login ↔ cadastro | Links claros; link "esqueci minha senha" no login |

## 2. Cadastro completo (US2)

| Passo | Esperado |
|---|---|
| Preencher nome, e-mail, senha, confirmação, telefone e aceitar termos | Cadastro conclui; no Firestore `users/{uid}` tem `role: customer`, `name`, `nameLower`, `email`, `phone`, `termsAcceptedAt`, `authProvider: "password"`, `addresses: []`, agregados 0, `createdAt`; `displayName` do Auth = nome |
| Digitar senha | Indicador de força + regras visíveis; senha < 8 rejeitada no campo |
| Senha ≠ confirmação | Campo de confirmação sinaliza |
| Não aceitar termos | Cadastro bloqueado, aceite sinalizado |
| E-mail já cadastrado | Mensagem "e-mail em uso" no campo (sem `alert`) |
| Buscar o cliente novo no painel admin (Clientes) | Encontrável por nome imediatamente (SC-003) |

## 3. Login com Google + completar cadastro (US2 / FR-012a)

| Passo | Esperado |
|---|---|
| "Entrar com Google" (conta nova) | Cria `users/{uid}` com nome/e-mail do Google, `authProvider: "google"`; leva ao passo "Complete seu cadastro" |
| Completar telefone + aceite | Perfil vira completo; segue para a loja/conta |
| Entrar por Google e **abandonar** o passo | Conta existe, marcada incompleta; ao acessar conta/checkout, re-solicita telefone/aceite |

## 4. Recuperação de senha (US3)

| Passo | Esperado |
|---|---|
| "Esqueci minha senha" com e-mail cadastrado | Confirmação clara de "e-mail enviado"; e-mail de redefinição chega |
| Mesmo fluxo com e-mail **inexistente** | **Mesma** confirmação (não revela que a conta não existe, SC-005) |
| Falha de envio (rede) | Mensagem amigável com "tentar novamente" |

## 5. Meus pedidos (US4)

| Passo | Esperado |
|---|---|
| Logado com cliente que tem pedidos → "Meus pedidos" | Lista dos próprios pedidos (nº, data, status, valor), mais recentes primeiro |
| Abrir um pedido | Itens com preço do momento, endereço, status, rastreio se houver |
| Cliente sem pedidos | Estado vazio ("você ainda não fez pedidos") + atalho ao catálogo |
| Tentar abrir por URL o pedido de outro cliente | Negado (não vê dados alheios, SC-006) |

## 6. Endereços com CEP (US5)

| Passo | Esperado |
|---|---|
| Novo endereço, informar CEP válido | Rua/bairro/cidade/UF preenchidos automaticamente; completar número/complemento |
| CEP inexistente ou ViaCEP fora do ar | Mensagem clara; preenchimento manual disponível (não bloqueia, SC-007) |
| Marcar um endereço como padrão | Apenas um fica padrão |
| Editar / remover endereço | Refletido na lista e no `users.addresses` |

## 7. Responsivo e regressão (SC-008 / SC-009)

| Passo | Esperado |
|---|---|
| Todos os fluxos em 375px | Sem scroll horizontal |
| Home, vitrine, carrinho, painel admin | Inalterados (sem regressão) |
| Suíte completa | 201 baseline + novos verdes |
