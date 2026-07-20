# Quickstart — Bloco de Lançamento (017 / M8)

Validação ponta a ponta. `npm run dev`/`test`/`lint`/`build` em `frontend/`. **Sem deploy de rules/índices.**

## Pré-requisitos
- Logado como **admin** (Dados da loja) e como **cliente antigo** (que aceitou a versão 2026-07-13 — qualquer conta criada antes desta feature).

## 1. Legal + re-aceite (US1)
1. Abra **/termos**, **/privacidade** e **/trocas** (deslogado): textos reais, versão "2026-07-19", aviso de minuta; em /trocas, o bloco dos **7 dias de arrependimento (CDC art. 49)** destacado no topo.
2. Rodapé linka os três; no **checkout**, a linha "Ao confirmar, você concorda…" com os links.
3. Com a **conta antiga**: navegue pela vitrine/produto/carrinho → **nenhum gate**. Entre em **/conta** → tela "Atualizamos nossos termos"; sem aceitar, vá ao **/checkout** → mesmo gate (não finaliza).
4. Marque o checkbox e aceite → conta/checkout liberam; recarregue → **não pede de novo** (perfil com versão 2026-07-19 + data).
5. Crie uma **conta nova** → nenhum gate (já nasce na vigente).

## 2. Institucional (US2)
1. Admin → **Dados da loja**: veja o aviso de pendência; preencha razão social, CNPJ, endereço, e-mail, WhatsApp; salve.
2. Rodapé (home/produto/carrinho): bloco com razão social · CNPJ · endereço · contato; links institucionais funcionando (nada de `<li>` morto).
3. **/sobre** e **/contato** abrem com conteúdo; Contato mostra os canais configurados (mailto/wa.me/tel).

## 3. SEO (US3)
1. Navegue: home, catálogo, produto → o **título da aba** muda por página; inspecione `<head>` → description/OG por página; produto com og:image da imagem.
2. Abra **/conta** e **/checkout** → `meta[name=robots]` = noindex.
3. `npm run build` → veja o log do **sitemap** gerado; abra `public/sitemap.xml` (fixas + produtos ativos) e `public/robots.txt` (Disallow admin/conta/checkout…; Sitemap apontado).
4. **Limitação registrada**: compartilhar URL de produto no WhatsApp mostra o OG **da loja** (crawlers sem JS) — esperado; resolve com servidor no futuro.

## 4. Regressão
- Checkout completo (entrega + retirada 016 + cupom 013), conta (007), vitrine, admin, avaliações (015), desejos (014) intactos.

## Gates
- `npm run test` verde (needsTermsReaccept; acceptCurrentTerms; TermsGate bloqueia/libera; usePageMeta); `npm run lint`; `npm run build` (com sitemap).

## Nota jurídica
- Os textos são **minutas** — revise (idealmente com advogado) antes do lançamento. O aviso de minuta pode ser removido ao aprovar os textos.
