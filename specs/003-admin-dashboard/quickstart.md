# Quickstart: Validação da Dashboard Administrativa

**Feature**: 003-admin-dashboard | **Date**: 2026-07-11

Guia de validação ponta a ponta. Referências: [data-model.md](./data-model.md),
[contracts/services.md](./contracts/services.md), [contracts/firestore.md](./contracts/firestore.md).

## Pré-requisitos

```powershell
cd frontend
npm install
npm run dev        # loja + painel em http://localhost:5173
```

- Projeto Firebase `versa-store-2eb1a` acessível (config já em `src/firebase/config.js`).
- `firestore.rules` e `firestore.indexes.json` publicados no projeto:
  `npx firebase-tools deploy --only firestore:rules,firestore:indexes` (ou via console).
- Dois usuários de teste no Firebase Auth: um admin (bootstrap abaixo) e um com
  `role = "customer"` (criado pelo registro normal da loja).

## 0. Bootstrap do primeiro admin (uma única vez, manual)

O painel não tem gestão de papéis nesta fase (premissa da spec) e as rules impedem qualquer usuário
de alterar o próprio `role` — portanto o primeiro admin é promovido manualmente:

1. Criar/logar o usuário pela tela de registro da loja (isso cria `users/{uid}` com
   `role: "customer"`).
2. No console do Firebase → Firestore → coleção `users`, localizar o documento do uid (o uid
   aparece em Authentication → Users).
3. Editar o campo `role` para `"admin"`.
4. Validar: recarregar a aplicação logado com esse usuário e abrir `/admin` — o painel deve abrir.

| Passo | Esperado |
|---|---|
| Antes da promoção, abrir `/admin` | Bloqueado (redirecionado com mensagem) |
| Após marcar `role = "admin"` no console e recarregar | Painel abre normalmente |
- Dados de exemplo: produtos com e sem variações, categorias com subcategoria, pedidos em vários
  status (criados via `orderService.createOrder` em script de seed ou teste — o checkout da loja
  ainda não existe).

## Gates automatizados (rodar antes de qualquer validação manual)

```powershell
cd frontend
npm run lint       # oxlint — zero erros (constituição I)
npm run test       # Vitest — services, guards, utils (constituição II)
npm run build      # bundle da loja não deve crescer: /admin/* é lazy (constituição IV)
```

## 1. Acesso restrito (US1 / SC-005)

| Passo | Esperado |
|---|---|
| Logar como `customer` e abrir `/admin` | Redirecionado com mensagem clara de acesso não autorizado |
| Anônimo abrir `/admin/orders` | Enviado ao `/login` |
| Logar como `admin` e abrir `/admin` | Visão geral com sidebar + header (nome do usuário) |
| No console Firebase, Rules Playground: `get /orders/{id}` como `customer` | **Negado** (proteção na camada de dados, não só no cliente) |
| Rules Playground: `update /users/{uid-do-customer}` pelo próprio usuário com `role: "admin"` | **Negado** (escalação de privilégio bloqueada nas rules) |
| Remover `role: "admin"` do usuário logado e tentar salvar um produto | Escrita negada pelas rules (revogação sem novo login) |

## 2. Produtos (US2 / SC-001)

| Passo | Esperado |
|---|---|
| `/admin/products` | Tabela paginada (20/pág.) com imagem, nome, SKU, categoria, preço (R$), estoque, status, criação (dd/mm/aaaa); skeleton durante carga |
| Buscar prefixo do nome; filtrar categoria/status/faixa de estoque; ordenar por preço | Resultados corretos; URL reflete filtros |
| Abrir um produto e voltar | Filtros, busca e página preservados (FR-085) |
| Cadastrar produto completo: seções, 3+ imagens arrastadas, reordenar, definir principal, variações (SKU/estoque próprios), promoção | Salvo; cronometrar < 3 min (SC-001) |
| Promoção com fim antes do início | Bloqueado com mensagem |
| SKU repetido (produto ou variação) | Bloqueado apontando duplicidade |
| Publicar sem imagem | Bloqueado; salvar como rascunho permitido |
| Preencher metade do formulário e recarregar a página | Rascunho automático oferece restaurar |
| Simular falha de upload (DevTools offline) | Erro por imagem + "tentar novamente"; formulário utilizável (FR-025) |
| Duplicar produto | Cópia em rascunho exigindo novo SKU |
| Excluir produto **com** pedidos | Soft delete: some do painel e da loja; pedido antigo intacto |
| Ações em massa (selecionar 3, desativar) | Confirmação explícita; os 3 atualizados |

## 3. Categorias (US3)

| Passo | Esperado |
|---|---|
| Criar categoria + subcategoria (nome, slug, descrição, imagem) | Hierarquia de 2 níveis na listagem e no form de produto |
| Tentar criar sub-subcategoria (nível 3) | Bloqueado (`hierarquia-invalida`) |
| Excluir categoria com produtos | Bloqueado; diálogo oferece mover produtos antes |
| Excluir categoria vazia | Confirmação → removida |

## 4. Pedidos (US4 / SC-006..009 / SC-002)

| Passo | Esperado |
|---|---|
| `/admin/orders` com filtros por status/período e busca por nº ou cliente | Encontrar pedido em < 10 s (SC-002) |
| Detalhe do pedido | Cliente, endereço, itens com preço do momento, histórico (data/hora + autor), rastreio, notas |
| Avançar `pago → em_separacao → enviado → entregue` | Cada mudança registrada no histórico |
| Tentar `pago → entregue` | Bloqueado com explicação da sequência |
| Cancelar pedido sem motivo | Bloqueado (`motivo-obrigatorio`) |
| Cancelar com motivo | Estoque devolvido + status + histórico atomicamente (verificar estoque do produto antes/depois) |
| Alterar preço do produto e reabrir pedido antigo | Pedido mantém preço original (SC-007) |
| Teste automatizado de concorrência (`orderService.test`): 2 `createOrder` simultâneos do último item | 1 sucesso, 1 `estoque-insuficiente`; estoque final 0, nunca negativo (SC-006) |

## 5. Visão geral (US5 / SC-003)

| Passo | Esperado |
|---|---|
| Abrir `/admin` com histórico de pedidos na base | Cards (hoje/7 dias/mês + delta %), gráfico, top-5, pedidos recentes, alertas em < 2 s (SC-003) — DevTools Network: **nenhuma** leitura da coleção `orders` inteira, só `dailyStats` + consultas `limit` |
| Trocar período do gráfico (7/30/90 dias, 12 meses, personalizado) | Série atualizada |
| Criar pedido de teste e recarregar | Cards e gráfico refletem o novo pedido (agregado incremental) |
| Zerar estoque de um produto | Alerta acionável com atalho para o produto |

## 6. Clientes (US6)

| Passo | Esperado |
|---|---|
| `/admin/customers` | Nome, e-mail, cadastro, nº pedidos, total gasto (R$); busca por nome/e-mail |
| Detalhe do cliente | Histórico de pedidos (atalhos) + endereços |
| Cancelar um pedido do cliente | `totalSpent`/`orderCount` ajustados |

## 7. Relatórios e CSV (US7 / SC-010)

| Passo | Esperado |
|---|---|
| Relatório de vendas por dia/semana/mês | Totais compatíveis com `dailyStats` |
| Relatório de produtos | Mais vendidos, sem vendas no período, estoque atual |
| Exportar listagem de produtos filtrada | CSV baixado; abrir no Excel pt-BR: acentos corretos (BOM), colunas separadas (`;`), cabeçalhos em português, linhas = exatamente o filtro aplicado (SC-010) |

## 8. UX transversal e regressão da loja (SC-004)

| Passo | Esperado |
|---|---|
| Todos os fluxos acima em viewport 375px (DevTools mobile) | Utilizáveis (SC-004); sidebar vira drawer |
| Navegação por teclado (Tab/Enter/Esc) nos fluxos principais | Focável e operável; diálogos fecham com Esc |
| Base vazia (sem produtos/pedidos) | Estados vazios orientando próximo passo, nunca tabela quebrada |
| DevTools offline ao abrir um módulo | Mensagem amigável + tentar novamente |
| Home, `/products`, `/product/:id`, login e registro | **Inalterados** — mesmo visual, mesmas rotas, destaque (feature 002) funcionando |
