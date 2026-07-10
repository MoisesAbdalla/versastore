# Phase 1 Data Model: Produto em Destaque (Admin + Home)

## Product (`products` no Firestore)

Documento já existente, criado por `createProduct` (`frontend/src/services/productService.js`).
Esta feature adiciona um campo e formaliza os já existentes.

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `name` | string | sim | já existente (rótulo no formulário: "Nome do Produto") |
| `category` | string | sim | já existente |
| `price` | number | sim | já existente |
| `stock` | number | sim | já existente — **campo cuja edição aciona a Constituição II (teste obrigatório)** |
| `description` | string | sim | já existente |
| `image` | string (URL Cloudinary) | sim no cadastro; preservado (não re-enviado) na edição se nenhum arquivo novo for selecionado (FR-003c) | já existente |
| `destaque` | boolean | sim a partir de agora | **novo campo desta feature** (FR-002). `true` = aparece em "Produtos em Destaque" na Home. Documentos criados antes desta feature não têm o campo — tratados como não destacados (FR-007), sem migração. |
| `createdAt` | Firestore Timestamp | sim | já existente (`serverTimestamp()`) |

**Regra de negócio**: não há limite de quantos produtos podem ter `destaque: true` simultaneamente
(FR-008).

## Superfícies de UI e os campos que manipulam

- **Admin — Cadastro** (`frontend/src/pages/Admin/index.jsx`, já existente): todos os campos acima
  exceto `createdAt`; `destaque` novo, checkbox desmarcado por padrão (`false`).
- **Admin — Listagem** (nova, FR-003): somente leitura; exibe ao menos `name` e `destaque` de cada
  produto, com ação de navegar para a edição.
- **Admin — Edição** (nova, FR-003a/b/c): todos os campos do cadastro, pré-preenchidos com os
  valores atuais do produto; `image` é o único campo com comportamento diferente do cadastro (opcional
  — mantém a URL atual se nenhum arquivo novo for selecionado).
- **Home — Produtos em Destaque** (`frontend/src/components/FeaturedProducts`, alterado): somente
  leitura; consome só os documentos com `destaque == true`, em ordem embaralhada por carregamento.

## Contrato de exibição do `ProductCard` (ajuste necessário — ver research.md §4)

O `ProductCard` existente espera `title`, `oldPrice`, `rating`, `imageAlt` — nenhum desses é um
campo real do documento Firestore. Mapeamento a aplicar na leitura (em `FeaturedProducts`, ao passar
os dados para `ProductCard`, ou diretamente dentro do `ProductCard`):

| Prop usada hoje por `ProductCard` | Origem no documento Firestore | Comportamento quando ausente |
|---|---|---|
| `title` | `name` | sempre presente (campo obrigatório do produto) |
| `category` | `category` | sempre presente |
| `price` | `price` | sempre presente |
| `oldPrice` | *(não existe no documento)* | **MUST omitir o preço "de" riscado** — exibir só o preço atual |
| `rating` | *(não existe no documento)* | **MUST omitir o bloco de avaliação (estrela + nota)** |
| `image` | `image` | já tem fallback (bloco com monograma) da feature 001 — reaproveitado |
| `imageAlt` | *(não existe no documento)* | usar `name` como alternativa (`imageAlt || title`, já é o padrão hoje) |

## Contrato de serviço (ver [contracts/product-service.md](./contracts/product-service.md))

Novas funções em `frontend/src/services/productService.js`:

- `getFeaturedProducts()` — lê produtos com `destaque == true`.
- `getProducts()` — lê todos os produtos (para a listagem do Admin).
- `getProduct(id)` — lê um produto por id (para pré-preencher a edição).
- `updateProduct(id, changes)` — atualiza um produto existente (usado pela edição; é a função que
  aciona a Constituição II quando `changes` inclui `stock`).
