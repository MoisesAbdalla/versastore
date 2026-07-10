# Phase 0 Research: Produto em Destaque (Admin + Home)

## 1. Consulta Firestore para produtos em destaque

**Decision**: `query(collection(db, "products"), where("destaque", "==", true))` + `getDocs`,
executada uma vez no `useEffect` de montagem do `FeaturedProducts` (sem `onSnapshot`, sem
`orderBy`).

**Rationale**: Um filtro de igualdade simples sem `orderBy` combinado não exige índice composto no
Firestore — funciona imediatamente, sem configuração adicional de índice. Documentos sem o campo
`destaque` são automaticamente excluídos pelo próprio Firestore (comportamento nativo de `where`
com igualdade: ausência de campo ≠ `true`), o que já resolve o FR-007 (produtos antigos sem o campo)
sem nenhuma lógica extra no cliente. `onSnapshot` (tempo real) foi descartado porque o spec já
assume busca "uma vez por carregamento" (Assumptions do spec).

**Alternatives considered**: `onSnapshot` para atualização em tempo real — rejeitado, fora do
comportamento assumido no spec e adiciona complexidade (listener a desmontar) sem requisito que
justifique. Buscar todos os produtos e filtrar no cliente — rejeitado, desperdiça leitura do
Firestore (custo e payload) à medida que o catálogo cresce.

## 2. Embaralhamento (shuffle) no carregamento

**Decision**: Fisher-Yates shuffle aplicado ao array retornado pela consulta, executado uma vez após
o fetch (dentro do mesmo `useEffect`), guardado em estado local (`useState`) — não em cada
render.

**Rationale**: Fisher-Yates é O(n), sem viés de distribuição (ao contrário de `sort(() =>
Math.random() - 0.5)`, que é um anti-padrão comum com distribuição enviesada). Rodar uma vez por
fetch (não a cada render) evita que a ordem mude sozinha durante a mesma visita (o spec pede
variação "a cada carregamento da página", não a cada re-render).

**Alternatives considered**: `Array.sort` com comparador aleatório — descartado, viés conhecido e
não garante permutação uniforme.

## 3. Estado vazio ("Em breve")

**Decision**: `FeaturedProducts` passa a ter três estados de renderização: carregando (nada
extra visível — a seção some/mantém espaço mínimo até a resposta), lista não vazia (carrossel atual,
já construído na feature 001), e lista vazia (mensagem "Em breve" no lugar do carrossel, mantendo o
título "Produtos em Destaque" da seção).

**Rationale**: Mantém a estrutura de seção já existente (heading fixo) e troca só o conteúdo interno
— menor diff, consistente com o carrossel já construído na feature 001 (que já lida com "poucos
itens" escondendo as setas; agora só adiciona o caso "zero itens").

**Alternatives considered**: Esconder a seção inteira quando vazia — rejeitado, o próprio spec
(FR-006) pede uma mensagem visível ("Em breve"), não a ausência da seção.

## 4. Incompatibilidade de forma de dados: `ProductCard` vs. documento real do Firestore

**Decision**: Ajustar `ProductCard` (e o mapeamento em `FeaturedProducts`) para o formato real do
documento Firestore criado por `createProduct` — campos `name`, `category`, `price`, `stock`,
`description`, `image`, `destaque`. Os campos `oldPrice` e `rating`, que `ProductCard` hoje trata
como obrigatórios (`product.oldPrice.toFixed(2)`, `product.rating`), **não existem** no formulário
de cadastro/edição desta feature (fora de escopo criá-los) — `ProductCard` MUST renderizar de forma
graciosa quando ausentes (ex.: omitir o preço "de/por" e mostrar só o preço atual quando não há
`oldPrice`; omitir o bloco de rating quando não há `rating`), em vez de acessar `.toFixed()` em
`undefined` (que quebraria a renderização).

**Rationale**: Esta é uma descoberta real da pesquisa — sem esse ajuste, a Home quebraria ao
renderizar o primeiro produto real vindo do Firestore (`Cannot read properties of undefined (reading
'toFixed')`). Nenhuma das duas opções de "resolver" isso adicionando `oldPrice`/`rating` ao
formulário do Admin foi pedida pelo usuário — inventar esses campos seria escopo não solicitado.
Tornar `ProductCard` tolerante à ausência é a correção mínima e correta.

**Alternatives considered**: Adicionar `oldPrice`/`rating` ao formulário de cadastro/edição —
rejeitado, não foi pedido e infla o escopo desta feature; manter `ProductCard` como está e confiar
que nunca faltará o campo — rejeitado, quebra na primeira vez que um produto real sem desconto/nota
for destacado.

## 5. Imagem opcional na edição (FR-003c)

**Decision**: A tela de edição usa dois estados separados: `existingImageUrl` (string, vem do
produto carregado) e `newImageFile` (File | null, só definido se o admin escolher um arquivo novo).
No preview, se `newImageFile` existir, mostra seu `createObjectURL`; senão, mostra `existingImageUrl`
diretamente (é uma URL, não precisa de `createObjectURL`). Ao salvar: se `newImageFile` existir, faz
upload via `uploadImage` (Cloudinary, serviço já existente) e usa a URL retornada; senão, reusa
`existingImageUrl` sem nenhuma chamada de upload.

**Rationale**: O componente `ImageUploader` existente (`frontend/src/pages/Admin/ImageUploader`) foi
construído só para o fluxo de cadastro, onde `image` é sempre um `File` novo (usa
`URL.createObjectURL(image)` internamente) — ele não sabe exibir uma URL remota já salva. Em vez de
reescrever o componente para um caso genérico, a tela de edição o usa apenas para a etapa "escolher
um arquivo novo" (opcional) e exibe a imagem já salva separadamente quando não há substituição
pendente — resolve o FR-003c sem modificar o comportamento do `ImageUploader` usado pelo cadastro
(risco zero de regressão no fluxo já funcional).

**Alternatives considered**: Generalizar `ImageUploader` para aceitar tanto `File` quanto `string`
(URL) — mais elegante a longo prazo, mas maior risco de regressão no cadastro (componente
compartilhado, mudança de contrato) para um ganho que a abordagem dos dois estados já entrega com
risco menor.

## 6. Introdução de Vitest + React Testing Library

**Decision**: Adicionar `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
`jsdom` como `devDependencies` do `frontend/`; configurar `test` em `vite.config.js` (Vitest
reaproveita a config do Vite nativamente) com ambiente `jsdom`; adicionar script `"test": "vitest
run"` ao `package.json`. Escrever pelo menos um teste cobrindo a função `updateProduct` (ou o fluxo
de salvar da tela de edição) alterando `estoque`, conforme exigido pela Constituição (II).

**Rationale**: A Constituição já nomeia Vitest + React Testing Library como a ferramenta prevista
("to be added under `frontend/`") — não há decisão de escolha de ferramenta em aberto, só a
execução. Esta é a primeira feature cuja lógica realmente aciona a regra "NON-NEGOTIABLE" de testes
(edição de estoque), então é o momento correto de introduzir o runner, em vez de adiar de novo.

**Alternatives considered**: Adiar a introdução de testes e pedir uma exceção documentada — rejeitado,
a Constituição não permite exceção para lógica de estoque ("No such logic ships untested"); Jest em
vez de Vitest — rejeitado, Vitest integra nativamente com a config do Vite já usada no projeto, sem
duplicar configuração de bundler.

## 7. Listagem de produtos no Admin

**Decision**: Uma tabela simples (MUI `Table`) buscando todos os produtos via `getDocs(collection(db,
"products"))` uma vez ao montar, exibindo nome e um indicador de destaque (ex.: um chip/ícone),
cada linha navegando para a tela de edição do produto correspondente. Sem paginação, busca ou
ordenação — catálogo atual é pequeno (Assumption do spec).

**Rationale**: Atende exatamente o mínimo pedido pelo FR-003 ("ao menos nome e indicação de
destaque") sem construir funcionalidades de administração de catálogo não solicitadas (busca,
filtros, paginação) — consistente com o princípio de não expandir escopo além do pedido.

**Alternatives considered**: Cards em grid (em vez de tabela) — visualmente mais alinhado ao resto
do site, mas uma tabela comunica melhor "lista para escanear e escolher" para uma ferramenta interna
de administração; decisão de gosto, tabela escolhida por ser o padrão mais comum para telas de admin
com poucos campos por item.
