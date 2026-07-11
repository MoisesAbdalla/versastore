# Research: Dashboard Administrativa do E-commerce

**Feature**: 003-admin-dashboard | **Date**: 2026-07-11

Decisões de arquitetura exigidas pelas limitações do Firestore (NoSQL, sem SUM/GROUP BY/JOIN/
full-text) e pelas restrições do projeto (sem backend, sem dependências novas). Cada decisão segue
o formato: Decision / Rationale / Alternatives considered.

---

## R-1. Variações de produto: array embutido no documento

**Decision**: Variações (`variations[]`) vivem como array de objetos dentro do documento do
produto: `{ id, attributes: {tamanho, cor}, sku, price?, stock }`. Quando o produto tem variações,
o estoque real vive nelas; o campo derivado `totalStock` (soma) é mantido no documento para
listagem, filtros por faixa de estoque e alertas.

**Rationale**:
- A baixa/devolução de estoque usa transação que lê e escreve o documento do produto; com array
  embutido, uma variação é atualizada na mesma leitura/escrita atômica do produto — com subcoleção
  seriam N leituras+escritas por transação e mais contenção.
- Variações são poucas (dezenas no máximo — tamanho × cor) e sempre exibidas junto ao produto no
  formulário e na loja; não há acesso a variação isolada sem o produto.

**Trade-off aceito — limite de 1 MB por documento do Firestore**: com o array embutido, produto e
variações compartilham o teto de 1 MB do documento. Com os campos definidos (~150 bytes por
variação), o limite comporta milhares de variações — ordens de grandeza acima do caso real
(tamanho × cor ≈ dezenas). Aceitamos esse teto conscientemente; se algum dia um produto precisar de
centenas de variações com dados ricos (ex.: imagem por variação), a decisão deve ser revisitada
para subcoleção, migrando junto a transação de estoque.

**Alternatives considered**: Subcoleção `products/{id}/variations` — rejeitada: quebra a atomicidade
simples da transação de estoque, exige consultas extras para montar listagem/formulário e índice
adicional para unicidade de SKU (que já será resolvida por consulta em `products` via array
`variationSkus`, ver data-model).

## R-2. Indicadores e gráficos: agregados diários `dailyStats/{yyyy-mm-dd}`

**Decision**: Documento por dia com `{ revenue, orderCount, unitsSold, unitsByProduct: {productId:
{name, units}} }`, mantido **na mesma transação** que cria/cancela/devolve pedido. A visão geral e
os relatórios leem apenas esses documentos: hoje = 1 doc; 7/30/90 dias e 12 meses = uma única range
query por ID do documento (IDs `yyyy-mm-dd` são ordenáveis lexicograficamente), no máximo ≤ 366
docs pequenos. Cancelamento/devolução **subtrai** dos agregados do dia original do pedido, mantendo
os relatórios como vendas líquidas.

**Rationale**: Firestore não tem SUM/GROUP BY barato; varrer `orders` a cada carregamento viola a
constituição (leituras sem escopo) e o SC-003 (< 2s independentemente do histórico). Agregar na
escrita custa 1 leitura + 1 escrita por transação de pedido — desprezível.

**Alternatives considered**:
- Varredura de `orders` com agregação client-side — rejeitada: custo/latência crescem com o
  histórico; viola constituição e SC-003.
- `getAggregateFromServer` (count/sum) por período — rejeitada como mecanismo principal: resolve
  totais simples, mas não "unidades por produto/top 5" nem gráfico por dia sem N consultas.
- Doc mensal adicional `monthlyStats` — adiada: a range query de ≤ 366 docs diários atende o
  gráfico de 12 meses com 1 consulta; adicionar segundo agregado só se o custo se provar real.

**Limitação documentada**: `unitsByProduct` cresce com o número de produtos vendidos no dia —
aceitável para a escala declarada (loja única, dezenas de pedidos/dia). Top-5 do período é
consolidado no cliente somando os mapas diários.

## R-3. Estoque: transações Firestore em toda mudança

**Decision**: `orderService` concentra três operações transacionais (`runTransaction`):
1. **Criação de pedido**: lê os produtos dos itens, valida `stock >= quantidade` (por variação
   quando houver), decrementa estoque/`totalStock`, gera número sequencial (R-14), grava o pedido
   com itens congelados, atualiza `dailyStats` e os agregados do cliente (R-15). Estoque
   insuficiente aborta a transação inteira.
2. **Cancelamento**: valida transição de status, devolve estoque dos itens, registra entrada no
   histórico com motivo, atualiza `dailyStats` (subtração) — tudo ou nada.
3. **Devolução** (`entregue → devolvido`): idem cancelamento (mercadoria retorna ao estoque).

**Rationale**: transação é o único mecanismo do Firestore que garante "estoque nunca negativo" sob
compras simultâneas (SC-006) e "cancelamento devolve estoque na mesma operação" (SC-009). O retry
automático de `runTransaction` resolve a concorrência do último item: a segunda transação relê o
estoque já decrementado e falha na validação.

**Alternatives considered**: `increment()` sem transação — rejeitado: não permite validar
`stock >= n` antes de decrementar (estoque ficaria negativo). Batched writes — rejeitado: sem
leitura transacional, mesma falha.

## R-4. Papel do usuário: documento `users/{uid}` com campo `role`

**Decision**: Papel armazenado em `users/{uid}.role` (`"admin"` | `"customer"`; futuro:
`"operator"`). As `firestore.rules` autorizam via
`get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin"`.
No cliente, o `AuthContext` existente é **estendido** (não substituído) para carregar o documento
do usuário após `onAuthStateChanged` e expor `{ user, role, isAdmin, loading }`. Permissões por
funcionalidade ficam em `constants/roles.js` (mapa papel → capacidades, ex.: `products.write`,
`orders.updateStatus`), consumidas pelo `AdminRoute` e por elementos condicionais da UI.

**Rationale**: Custom claims exigem Firebase Admin SDK, que só roda em backend/Cloud Function —
fora do escopo desta fase (backend vazio, restrição explícita). O documento `users` é gerenciável
manualmente no console (premissa da spec: primeiro admin atribuído na base). A revogação vale
imediatamente na camada de dados: a próxima operação relê o documento nas rules (edge case da
spec), enquanto custom claims exigiriam refresh de token.

**Alternatives considered**: Custom claims — rejeitada nesta fase (exige backend); migração futura
é compatível: as rules passam a checar `request.auth.token.role` sem mudar o modelo de permissões
do cliente. Lista fixa de UIDs nas rules — rejeitada: hard-coded, viola FR-003.

**Custo aceito**: 1 leitura extra de documento por avaliação de rules (o Firestore faz cache do
`get()` dentro da mesma avaliação de request).

## R-5. Busca e filtros: prefixo sobre campos normalizados

**Decision**: Campos desnormalizados gravados em todo create/update:
- `products.nameLower` (nome em minúsculas, sem acentos) e `products.skuUpper`;
- `orders.customerNameLower`; busca por número de pedido é match exato em `orderNumber`;
- `users.nameLower` e busca exata por `email`.
Busca por prefixo com `where(campo, ">=", termo)` + `where(campo, "<=", termo + "")`.

**Rationale**: Firestore não tem full-text nativo; serviços externos (Algolia/Typesense) são
dependência nova e backend — vetados. Prefixo cobre o uso real do lojista (digitar o início do nome
ou o SKU).

**Limitação documentada (spec/UI)**: busca não encontra substring interna ("camiseta azul" não é
encontrada por "azul"). Mitigação futura fora do escopo.

## R-5a. Matriz de combinações de filtros na listagem de produtos

Revisão (2026-07-11, após questionamento correto do usuário): a exclusividade total entre filtros
era mais conservadora do que o Firestore exige. Regras reais do Firestore que governam cada caso:
(a) filtros de **igualdade combinam livremente** entre si e com no máximo ordenações indexadas —
basta o índice composto existir; (b) **um range** (`<`,`<=`,`>`,`>=`) combina com igualdades, mas a
ordenação primária deve ser o campo do range; (c) cada combinação (igualdades × campo de ordenação)
exige **um índice composto próprio** — o custo real de combinar é a multiplicação de índices, não
uma proibição do banco.

| Combinação | Status | Motivo específico |
|---|---|---|
| categoria + status | **Suportada** | Igualdade + igualdade; índices `deleted+categoryId+status+{createdAt,price,nameLower,totalStock}` declarados |
| categoria + estoque | **Suportada** | Igualdades + range em `totalStock`; ordenação forçada a `totalStock` (regra b); índice `deleted+categoryId+totalStock` |
| status + estoque | **Suportada** | Idem; índice `deleted+status+totalStock` |
| categoria + status + estoque | **Suportada** | Idem; índice `deleted+categoryId+status+totalStock` |
| ordenação por coluna com filtros | **Suportada** | Um índice por combinação filtros×coluna (todos declarados); direção inversa é atendida pelo mesmo índice (Firestore percorre índices em ordem reversa) |
| busca (prefixo) + qualquer filtro | **Não combinada (decisão)** | A busca é um OR entre dois campos (`nameLower` OU `skuUpper`), implementado como **duas queries mescladas no cliente** — a mescla não possui cursor único estável, então paginação por `startAfter` fica incorreta; além disso, cada filtro adicional exigiria índices para os dois ramos do OR (multiplicação 2×N). O operador `or()` nativo existe, mas com dois ranges de prefixo + igualdades + `orderBy` a exigência de índices e as restrições de ordenação/cursor entre disjunções tornam o custo desproporcional à escala declarada. Busca zera os filtros; filtros zeram a busca. |

Consequência de UX: com "estoque baixo" (range) ativo, a tabela é ordenada por estoque (informado
na UI); ordenação por outras colunas fica disponível nas demais combinações.

## R-6. Paginação: cursores `startAfter` + estado na URL

**Decision**: Todas as listagens usam `orderBy(...) + limit(20) + startAfter(cursorDoc)`; nunca
offset. O hook `useListState` serializa filtros/busca/ordenação/nº da página e o **ID do documento
cursor** (`after=<docId>`) nos query params da URL; `usePagination` mantém a pilha de cursores em
memória para "página anterior". Ao voltar do detalhe (ou deep-link), a listagem restaura filtros da
URL e, se houver `after`, refaz `getDoc(after)` para reconstituir o cursor.

**Rationale**: Offset no Firestore cobra leitura de todos os docs pulados; cursor é O(página).
Estado na URL cumpre FR-085 (voltar do detalhe preservando filtros/página) e torna a visão
compartilhável.

**Limitação documentada**: em deep-link para página N, "anterior" recomeça da página 1 (pilha de
cursores não é serializável) — aceitável; navegação normal preserva a pilha.

## R-7. Soft delete: flag `deleted` + `deletedAt`

**Decision**: Produtos ganham `deleted: false` (default) e `deletedAt: null`. Exclusão de produto
**com pedidos** grava `deleted: true, deletedAt: serverTimestamp()`; sem pedidos, exclusão física.
"Tem pedidos?" é respondido por consulta `orders where productIds array-contains {id} limit 1`
sobre o array desnormalizado `orders.productIds`. **Todas** as consultas de listagem (painel e
loja) filtram `deleted == false`.

**Rationale**: Firestore não indexa "campo ausente" de forma consultável — flag booleana com
default explícito permite `where("deleted", "==", false)` em índice composto. `deletedAt` fica como
auditoria. O array `productIds` evita varrer pedidos para decidir o tipo de exclusão.

**Alternatives considered**: somente `deletedAt` (null/timestamp) — rejeitado: `where("deletedAt",
"==", null)` funciona, mas exigiria backfill de `null` em todos os docs antigos da mesma forma que
a flag, e a flag é mais legível nas rules/índices. Produtos legados sem o campo passam por
normalização única na primeira edição (e a loja trata ausência como não excluído).

## R-8. Índices compostos: declarados e versionados

**Decision**: Índices compostos listados em [contracts/firestore.md](./contracts/firestore.md) e
versionados em `firestore.indexes.json` na raiz (deploy junto com as rules). A ordenação por coluna
na UI é limitada às combinações indexadas (colunas de data, preço, estoque, nome); combinações não
indexadas não são oferecidas na UI.

**Rationale**: Toda query com `where` de igualdade + `orderBy` em campo diferente exige índice
composto no Firestore; declará-los antecipadamente evita o erro em runtime e documenta o custo de
cada filtro novo.

## R-9. Exportação CSV: 100% no cliente

**Decision**: `utils/csv.js` gera o arquivo a partir das linhas já carregadas/filtradas na tela
(re-executando a query filtrada **sem** limite de página, com teto de segurança de 5.000 linhas):
BOM UTF-8 (`﻿`), separador `;`, valores com aspas escapadas, cabeçalhos em pt-BR, download via
`Blob` + link temporário. Nomes de arquivo: `produtos-2026-07-11.csv` etc.

**Rationale**: Sem backend disponível (restrição). Separador `;` + BOM é o que o Excel pt-BR abre
corretamente por padrão. O teto de linhas protege contra exportação acidental de coleção gigante
(constituição, leituras com escopo).

## R-10. Gráfico de vendas: componente SVG próprio

**Decision**: `components/SalesChart/` — gráfico de barras/linha em SVG puro (eixos, tooltips via
title/foco, responsivo por `viewBox`), alimentado pelos docs de `dailyStats`, estilizado com CSS
Modules e tokens do design system.

**Rationale**: Nenhuma lib de gráficos está instalada (`@mui/lab` não inclui charts) e a restrição
veta dependência nova sem justificativa forte. Um gráfico de série temporal única (vendas/dia) é
pequeno o suficiente (~150 linhas) para implementação própria com acessibilidade básica (papel
`img`, descrição textual, tabela alternativa para leitor de tela).

**Alternatives considered**: `@mui/x-charts` — rejeitada nesta fase: dependência nova para um único
gráfico simples; reavaliar se o módulo de relatórios crescer (justificativa forte passaria a
existir).

## R-11. Descrição rica: editor próprio leve com sanitização

**Decision**: `components/RichTextField/` — `contentEditable` com toolbar mínima (negrito, itálico,
lista com marcadores/numerada), salvando HTML **sanitizado por allowlist**
(`b, strong, i, em, ul, ol, li, p, br` — atributos removidos) tanto na gravação quanto na
renderização na loja.

**Rationale**: A spec assume formatação básica; MUI não tem editor; libs de rich text são
dependência nova vetada. A sanitização por allowlist neutraliza XSS de HTML armazenado.

**Alternatives considered**: armazenar Markdown — rejeitado: exigiria parser (dependência nova) ou
parser próprio mais complexo que a allowlist; `document.execCommand` é deprecated mas estável nos
navegadores-alvo para esses 4 comandos — encapsulado no componente para troca futura.

## R-12. Rascunho automático: localStorage com debounce

**Decision**: O formulário de produto persiste o estado em
`localStorage["product-draft:<id|new>"]` com debounce de ~1s; ao abrir o formulário com rascunho
existente, oferece restaurar ou descartar. Imagens entram no rascunho **após** upload (como URLs
Cloudinary); arquivos ainda não enviados não são persistíveis (limitação documentada, alinhada à
premissa da spec de recuperação no mesmo dispositivo/navegador).

**Rationale**: Sem backend e sem custo de escrita no Firestore a cada tecla; localStorage cobre o
cenário-alvo (fechar aba/recarregar). Rascunho **publicável** continua sendo o status `rascunho` do
produto no Firestore — são mecanismos complementares.

## R-13. Upload Cloudinary: retry com backoff

**Decision**: `cloudinaryService.js` ganha `uploadImageWithRetry(file, {attempts: 3})` — backoff
exponencial (1s, 2s, 4s), erro final tipado com mensagem em pt-BR. Uploads múltiplos rodam em
paralelo com resultado individual por imagem: falha de uma não bloqueia as demais nem o formulário
(FR-025); a UI mostra estado por imagem com ação "tentar novamente".

**Rationale**: O service atual lança erro genérico na primeira falha; upload direto do cliente está
sujeito a instabilidade de rede móvel (lojista no celular — spec UX).

## R-14. Número do pedido: contador transacional

**Decision**: `counters/orders { current: N }` incrementado dentro da transação de criação do
pedido; número exibido como `#000123` (`orderNumber: 123` numérico para busca exata).

**Rationale**: IDs do Firestore são opacos; lojista precisa de número curto sequencial para busca e
atendimento. O incremento na transação garante unicidade sem colisão.

**Limitação aceita**: contador único serializa criações de pedido concorrentes — sem impacto na
escala declarada (dezenas de pedidos/dia).

## R-15. Clientes: coleção única `users` com agregados

**Decision**: Uma única coleção `users/{uid}` para qualquer usuário autenticado, com `role`
distinguindo `customer`/`admin`. Clientes carregam `addresses[]`, `orderCount` e `totalSpent`,
mantidos na transação de criação do pedido (e ajustados em cancelamento/devolução). O módulo
Clientes lista `users where role == "customer"`.

**Rationale**: Evita duplicar identidade em `customers` separada (uma fonte de verdade por uid,
mesmo doc usado pelas rules em R-4). Totais desnormalizados evitam agregação por varredura de
pedidos na listagem (constituição).

**Alternatives considered**: coleção `customers` separada — rejeitada: duas fontes de verdade para
o mesmo uid e uma leitura extra nas rules.
