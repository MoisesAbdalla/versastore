# Research: Vitrine Completa

**Feature**: 005-vitrine-completa | **Date**: 2026-07-12

Decisões de arquitetura da camada de apresentação pública, sobre a infraestrutura da feature 003.
Formato: Decision / Rationale / Alternatives considered.

---

## R-1. Leitura pública: variantes que forçam `status == "ativo"`

**Decision**: Adicionar ao `productService` funções de leitura **pública**, separadas das do admin:
- `listPublicProducts({categoryId, sort, search, cursor, pageSize})` — sempre aplica
  `where("deleted","==",false)` **e** `where("status","==","ativo")`.
- `getPublicProduct(id)` — lê o documento e, se o produto não for ativo/existente, retorna `null`
  (para 404). **Trata `permission-denied` como `null`**: as rules negam a leitura de produto inativo
  para não-admin, então o SDK lança erro de permissão — capturá-lo e devolver `null` evita vazar a
  existência do produto (SC-002) e não distingue "inativo" de "inexistente".

**Rationale**: a segurança real é das rules (já restringem público a `status=="ativo" &&
deleted==false`), mas o cliente precisa de uma consulta que **nunca** peça inativos (senão a rule
nega e a listagem quebra). Separar do `listProducts` do admin (que lista qualquer status) evita que
uma mudança no admin vaze produtos ocultos para a loja.

**Alternatives considered**: reusar `listProducts` do admin com `status:"ativo"` — rejeitado:
acoplaria a vitrine a defaults do admin e um esquecimento (ex.: remover o filtro) vazaria rascunhos;
a variante pública é uma barreira explícita alinhada a FR-016.

## R-2. Busca: `searchKeywords` (array-contains) com tokens + prefixos

**Decision**: Cada produto ganha `searchKeywords: string[]`, gravado pelo **admin** em todo
create/update (dentro do `withDerivedFields` existente) e preenchido por backfill. Conteúdo:
para cada token de **nome**, **SKU** e **nome da categoria** (normalizado: minúsculas, sem acentos),
gerar os prefixos de comprimento ≥ 3 até o token inteiro. Ex.: "Camiseta" →
`["cam","cami","camis","camise","camiset","camiseta"]`; SKU "NIKE-001" → tokens do SKU normalizado.
A busca da vitrine normaliza o termo e consulta `where("searchKeywords","array-contains",termo)` +
`status==ativo` + `deleted==false`.

**Rationale**: Firestore não tem full-text; `array-contains` com prefixos pré-computados resolve
"camis" → "Camiseta" (D3, SC-006) com **uma** consulta indexada, cobrindo nome, SKU e categoria sem
serviço externo. O custo é tamanho do array (dezenas de tokens/produto) — irrelevante no limite de
1 MB do documento.

**Limitações documentadas**: (a) uma busca combina com **um** filtro de igualdade adicional
(categoria) mas não com ordenação arbitrária de preço — a busca ordena por relevância implícita
(createdAt) e o "ordenar" fica desabilitado durante busca ativa (mesma classe de limitação do
admin, R-5a da 003); (b) termos com < 3 caracteres não são indexados (mínimo exigido na UI). O
normalizador de tokens é **um único módulo** (`utils/searchKeywords.js`) usado no write do admin, no
backfill e no parsing da query — garantindo simetria (nota 2 do /speckit-plan da spec).

**Alternatives considered**: manter só `nameLower`/`skuUpper` com prefixo de início (busca atual do
admin) — rejeitado: não cobre categoria, não acha token interno ("camiseta azul" por "azul") e o D3
exige abrangência. Algolia/Typesense — fora de escopo (dependência + custo), só se o nativo falhar.

## R-3. Zoom da galeria: componente próprio, sem dependência

**Decision**: `components/ProductGallery/` com imagem principal + miniaturas. Zoom:
- **Desktop**: ao passar o mouse sobre a principal, uma lente amplia a região sob o cursor
  (imagem de zoom em resolução maior via Cloudinary; `background-position` seguindo o cursor) ou
  cursor "zoom-in" abre a imagem grande.
- **Mobile**: toque abre um **modal** com a imagem em resolução alta, onde o **pinch-to-zoom
  nativo** do navegador funciona (sem lib de gesto).

**Rationale**: a spec (D6) e a constituição vetam dependência sem justificativa forte; um zoom de
imagem única é pequeno o bastante para CSS/DOM próprios. O modal + pinch nativo cobre o mobile sem
biblioteca de gestos.

**Alternatives considered**: libs de zoom/lightbox (react-medium-image-zoom, etc.) — rejeitadas:
dependência nova para um comportamento simples; reavaliar só se o produto exigir zoom com
panning/rotação avançados.

## R-4. Vigência de promoção: fuso America/Sao_Paulo

**Decision**: `utils/promo.js` com `isPromoActive(product, now)` e `effectivePrice(product, now)`.
A avaliação de "hoje está dentro de `promoStart`–`promoEnd`" usa o **dia corrente no fuso
America/Sao_Paulo** (via `Intl.DateTimeFormat` com `timeZone`, mesmo padrão de `dayKey` da 003),
nunca o fuso do dispositivo. Regra: promoção vigente se `promoPrice < price` **e** (sem datas → true;
com datas → `promoStart <= agoraSP <= promoEnd`).

**Rationale**: promoção que "termina dia 25" deve expirar no mesmo instante para todos (clarificação
2026-07-12). Avaliar no fuso do navegador faria um cliente em Lisboa ver o preço mudar 4h antes de
um em São Paulo. O modelo já grava as datas no fuso de Brasília (feature 003), então a leitura no
mesmo fuso é consistente ponta a ponta.

**Alternatives considered**: avaliar em UTC — rejeitado: "fim do dia 25" gravado como
`25T23:59:59-03:00` já é um instante absoluto, mas a **comparação de data de calendário** ("é dia 25
ainda?") precisa do fuso SP para bater com a intenção do lojista; usar o fuso local do cliente
quebraria a igualdade entre visitantes.

## R-5. Imagens: transformação Cloudinary por contexto

**Decision**: `cloudinaryService.cloudinaryUrl(url, { w, extra })` insere `f_auto,q_auto,w_{w}`
(mais transformações opcionais) logo após o segmento `/upload/` da URL de entrega do Cloudinary.
Larguras por contexto: card (~400), miniatura (~120), principal (~800), zoom (~1600). URLs que não
sejam do padrão Cloudinary retornam inalteradas (fallback seguro).

**Rationale**: as imagens são servidas full-res hoje (o `ProductCard` usa `product.image` cru); D5
exige `f_auto,q_auto,w_` para peso/latência (constituição IV). Inserir a transformação por string é
suficiente e não exige SDK do Cloudinary (sem dependência nova).

**Alternatives considered**: SDK `@cloudinary/react` — rejeitado: dependência para montar uma URL
que é trivial por string; o helper próprio é ~15 linhas testáveis.

## R-6. Estado do catálogo 100% na URL

**Decision**: filtro de categoria (`?categoria=`), ordenação (`?ordenar=`), busca (`?q=`) e cursor
de paginação vivem na URL, reusando a mesma ideia do `useListState`/`usePagination` do admin,
adaptada em `hooks/useCatalog.js`. Recarregar ou compartilhar a URL restaura a visão (SC-005).

**Rationale**: catálogo compartilhável e navegação por voltar/avançar do browser são padrão de
e-commerce; o padrão já existe e foi validado no admin.

## R-7. CartContext: interface definitiva, implementação em memória

**Decision**: `contexts/CartContext.jsx` expõe exatamente `{ items, count, subtotal, addItem(product,
variation, qty), removeItem(lineId), updateQty(lineId, qty), clear() }`. Cada item é uma **linha**
identificada por `productId + variationId`, guardando cópia de nome, preço efetivo do momento,
imagem, atributos da variação e quantidade. `addItem` valida estoque da variação (não deixa exceder)
e soma à linha existente. M1: estado em `useState`/`useReducer` (some ao recarregar). M2 troca o
armazenamento por localStorage **sem alterar a interface** nem os consumidores.

**Rationale**: FR-019/D4 pedem a interface definitiva agora para o M2 ser só persistência. Linha por
`productId+variationId` é o modelo natural (mesma variação soma quantidade; variações diferentes são
linhas distintas) e já prepara o formato de item que o checkout (M4) vai congelar.

**Nota**: o preço guardado na linha é o **preço efetivo de exibição** (com promoção vigente); a
**fonte de verdade** do valor cobrado continua sendo o preço congelado na transação do pedido (M4,
já existente) — o carrinho é conveniência de UI, não autoridade de preço.

## R-8. Paginação: cursor + "carregar mais"

**Decision**: catálogo carrega 20 por vez com cursor (`startAfter`); botão "carregar mais" **anexa**
a próxima página à grade. Filtro/ordenação/busca ficam na URL e são compartilháveis; a profundidade
de scroll (quantas páginas já foram anexadas) **não** é restaurada em deep-link — a URL
compartilhada abre na primeira página com os mesmos filtros.

**Rationale**: "carregar mais" é o padrão de vitrine (melhor que páginas numeradas para descoberta);
cursor evita o custo de offset. Restaurar N páginas anexadas por URL exigiria serializar a pilha de
cursores — complexidade desproporcional; filtros compartilháveis (o que importa para SC-005) são
preservados.

## R-9. Ordenação: reuso de índices, verificação de direção

**Decision**: as cinco ordenações (mais recentes, preço ↑/↓, nome A–Z/Z–A) sobre `status==ativo &&
deleted==false` reusam os índices `deleted+status+{createdAt,price,nameLower}` já declarados. Para
preço↓ e nome Z–A (direção inversa do trailing `orderBy`), o Firestore **reverte o índice** quando
todos os campos anteriores são igualdades (`deleted`, `status` são `==`), então **não** exige índice
novo. Com filtro de categoria, reusam-se os índices `deleted+categoryId+status+{...}` (também já
declarados). O plano de tarefas confirma isso rodando cada ordenação com o emulador/console.

**Rationale**: evita criar índices redundantes; a regra de reversão do Firestore cobre as direções
inversas. Único índice realmente novo é o de busca (R-2), declarado em contracts/firestore.md.

**Limitação documentada**: durante busca ativa (`array-contains`), a ordenação por preço não é
oferecida (um `array-contains` + `orderBy(price)` exigiria índice próprio e a relevância por
createdAt é suficiente no M1).
