# Data Model: Conta do Cliente

**Feature**: 007-conta-cliente | **Date**: 2026-07-13

A feature escreve apenas no **próprio documento do usuário** (`users/{uid}`) e **lê** os próprios
pedidos. Nenhuma coleção nova, nenhuma mudança de rules.

## Coleção `users/{uid}` — campos adicionados/preenchidos

Já existe (feature 003/R-15). O cadastro do M3 passa a preencher e adicionar:

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | **obrigatório** no cadastro; também gravado no `displayName` do Auth |
| `nameLower` | string | derivado (`normalizeForSearch`) — o admin busca por aqui (fecha a raiz do bug) |
| `email` | string | do Auth |
| `phone` | string | **NOVO. Obrigatório** (ambos os fluxos); guardado normalizado (só dígitos) + exibido com máscara |
| `termsAcceptedAt` | Timestamp \| null | **NOVO.** Marca do aceite de termos/privacidade (LGPD); `null` = ainda não aceitou |
| `termsVersion` | string \| null | **NOVO.** Versão do documento de termos/privacidade aceita (ex.: `"2026-07-13"`). Sem isto, quando o texto mudar no M8 não dá para saber quem aceitou qual versão — data sozinha não resolve. Constante única no código (`TERMS_VERSION`) |
| `authProvider` | string | **NOVO.** `"password"` ou `"google"` — origem da conta |
| `role` | `"customer"` | inalterado; **imutável pelo cliente** (rule) |
| `addresses` | array\<Endereço\> | ver abaixo; editável pelo próprio usuário |
| `orderCount` / `totalSpent` | number | mantidos pelas transações de pedido; **imutáveis pelo cliente** (rule) |
| `createdAt` | Timestamp | `serverTimestamp()` na criação |

**Perfil completo (derivado, sem campo próprio)**: `Boolean(phone) && termsAcceptedAt != null`
(o aceite grava `termsAcceptedAt` **e** `termsVersion` juntos).
Contas por e-mail/senha nascem completas (o formulário coleta tudo); contas por Google nascem
**incompletas** (Google fornece só nome/e-mail) e passam pelo "Complete seu cadastro". Contas
legadas (feature 003) sem `phone`/`termsAcceptedAt` também contam como incompletas e são convidadas a
completar.

### Endereço (item de `users.addresses`)

Mesma forma de `orders.shippingAddress` (feature 003), com id e flag de padrão:

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | gerado no cliente (uuid curto), estável |
| `cep` | string | 8 dígitos (normalizado); usado na busca ViaCEP |
| `rua` | string | preenchido pelo CEP (editável) |
| `numero` | string | manual (obrigatório) |
| `complemento` | string | manual (opcional) |
| `bairro` | string | preenchido pelo CEP (editável) |
| `cidade` | string | preenchido pelo CEP |
| `uf` | string (2) | preenchido pelo CEP |
| `isDefault` | boolean | **apenas um** endereço `true` por vez (o service normaliza ao salvar) |

## Coleção `orders` — leitura do próprio cliente

Sem alteração de escrita. Leitura nova (cliente): `where customerId == uid, orderBy createdAt desc`,
paginada por cursor — reusa o índice `orders (customerId ASC, createdAt DESC)` já declarado
(feature 003). A rule já permite `resource.data.customerId == request.auth.uid`. O detalhe reusa a
mesma forma do pedido (itens congelados, `statusHistory`, `trackingCode`, endereço) — o cliente
**não** edita pedidos.

## Consentimento LGPD (base para o M8)

O aceite fica registrado em `users.termsAcceptedAt` (instante) **e** `users.termsVersion` (versão do
documento aceita) — juntos permitem, quando o texto mudar no M8, saber **quem aceitou qual versão** e
re-solicitar o aceite de quem está numa versão antiga. A versão vem de uma constante única no código
(`TERMS_VERSION`, ex.: `"2026-07-13"`), atualizada sempre que os documentos mudarem. O **texto legal**
em si é responsabilidade do M8; o M3 entrega páginas `/termos` e `/privacidade` com **conteúdo
provisório** (placeholder claro de que serão substituídas) e grava o aceite com a versão vigente.

## Validações centralizadas (`utils/validation.js`)

- **E-mail**: formato (regex conservador); unicidade é do Firebase Auth (`auth/email-already-in-use`).
- **Senha**: mínimo 8 caracteres; força orientativa (comprimento + variedade de classes) — 0..4.
- **Confirmação**: igual à senha.
- **Telefone**: 10–11 dígitos (fixo/celular BR); máscara `(99) 99999-9999`.
- **CEP**: 8 dígitos; máscara `99999-999` (só usado nos endereços).
- **Nome**: não vazio, ≥ 2 palavras recomendado (aviso, não bloqueio).
- **Termos**: checkbox marcado (obrigatório).
