# Phase 0 Research: Redesenho Premium/Luxo da Home

## 1. Carrossel de "Produtos em Destaque"

**Decision**: Construir um carrossel próprio e leve, sem biblioteca externa — `overflow-x` com
CSS `scroll-snap-type`/`scroll-snap-align` para o trilho de cards, e botões nativos de
avançar/voltar controlando a posição via `scrollBy`. Os botões são elementos `<button>` reais
(focáveis e ativáveis por Enter/Espaço por padrão do navegador), satisfazendo o requisito de
acessibilidade por teclado do FR-005 sem precisar implementar um widget `tablist` com roving
`tabindex`. Por FR-005 (resolvido na clarificação), os botões ficam ocultos quando todos os
produtos já cabem na largura visível — verificado via comparação entre a largura do trilho de
scroll (`scrollWidth`) e a largura visível (`clientWidth`).

**Rationale**: O catálogo atual tem só 2 produtos; nenhum requisito do spec pede autoplay, loop
infinito ou múltiplos itens por "página" com paginação complexa. Uma biblioteca de carrossel traria
peso de bundle e sua própria superfície de acessibilidade para auditar, sem necessidade real dado
o escopo. A Constituição (IV) já exige justificar qualquer coisa que arrisque o orçamento de
performance — uma dependência nova não se justifica aqui.

**Alternatives considered**:
- `swiper` / `keen-slider` / `embla-carousel`: mais recursos (autoplay, paginação, virtualização),
  mas ~15–30kB+ gzip adicionais e complexidade desnecessária para 2–dezenas de produtos.
- Componentes do MUI (`@mui/material`, `@mui/lab`): não incluem um carrossel pronto.

## 2. Otimização de imagens grandes (hero, categorias, produtos)

**Decision**: Servir imagens responsivas via `srcset`/`sizes` (variantes de largura geradas a
partir dos arquivos-fonte). A imagem do hero — que é o elemento de LCP (Largest Contentful Paint)
da página — carrega eager, sem `loading="lazy"`, e usa `fetchpriority="high"`. Imagens de
Categorias e Produtos, abaixo da dobra, usam `loading="lazy"`. Formato preferencial WebP com
fallback (`<picture>`) apenas se necessário para compatibilidade.

**Rationale**: SC-002 exige manter o orçamento de <3s interativo mesmo com fotografia grande.
Lazy-loading do hero atrasaria o LCP (prejudica exatamente a métrica que o orçamento protege);
lazy-loading de tudo que está abaixo da dobra evita baixar bytes que o visitante pode nunca rolar
até ver.

**Alternatives considered**:
- Serviço de imagem/CDN externo (ex.: Cloudinary): resolveria otimização automaticamente, mas é uma
  mudança de infraestrutura fora do escopo deste redesenho visual.
- Uma única imagem de tamanho fixo por asset: mais simples, mas desperdiça banda em mobile e é o
  padrão que mais arrisca estourar o orçamento de performance.

## 3. Tipografia editorial

**Decision**: Título/heading em fonte serifada de alto contraste; corpo de texto e elementos de UI
(botões, labels, navegação) em sans-serif limpa. Ambas as famílias **self-hosted** (arquivos de
fonte no projeto, não um `<link>` para Google Fonts em runtime), com `font-display: swap` e uma
pilha de fallback de fontes de sistema, para que o primeiro paint nunca fique bloqueado esperando o
download da fonte. A escolha exata das famílias fica registrada nos tokens de design (Phase 1 /
`docs/design-system.md`), mas a restrição (serifada nos títulos + sans no corpo, self-hosted,
`swap`) já está definida aqui.

**Rationale**: Atende ao pedido de "tipografia editorial... serifada" sem abrir uma dependência de
rede externa (Google Fonts CDN) que adicionaria uma requisição cross-origin bloqueante e um ponto de
falha fora do controle do projeto — indo contra o orçamento de performance da Constituição.

**Alternatives considered**:
- `<link>` para Google Fonts: mais simples de configurar, mas adiciona uma requisição de rede
  render-blocking a um domínio externo.
- Manter só a sans-serif atual (Poppins) em peso mais forte: não atende ao pedido explícito de
  tipografia serifada do usuário.

## 4. Paleta preto/branco/metálico — tokens concretos e validação de contraste

**Decision**: Tom metálico = dourado quente (conforme Assumption do spec, já que o usuário não
especificou dourado vs. bronze). Tokens verificados por cálculo de contraste WCAG 2.x (luminância
relativa):

| Token | Hex | Uso | Contraste verificado |
|---|---|---|---|
| `--color-black` | `#0B0B0C` | Fundo escuro (TopBar, Footer, seções dark) | vs. branco: 19.67:1 |
| `--color-white` | `#FFFFFF` | Fundo claro (padrão da página) | vs. preto: 19.67:1 |
| `--color-gold` | `#B08D57` | Acentos, texto grande, bordas/ícones, texto normal sobre fundo preto | vs. preto: 6.36:1 (passa normal); vs. branco: 3.09:1 (passa só texto grande — **não usar para texto de tamanho normal sobre fundo branco**) |
| `--color-gold-text` | `#8C6D3F` | Texto dourado de tamanho normal sobre fundo branco (ex.: preço em destaque) | vs. branco: 4.80:1 (passa normal) |
| `--color-text-muted` | `#5C5C5C` | Texto secundário sobre fundo branco | vs. branco: 6.69:1 |
| `--color-text-muted-inverse` | `#B5B5B5` | Texto secundário sobre fundo preto | vs. preto: 9.59:1 |

Todos os pares acima passam WCAG AA para o uso a que se destinam (ver coluna de contraste). A
regra prática para implementação: **`--color-gold` só em texto grande (≥24px, ou ≥18.66px bold)
quando o fundo for branco; em texto de tamanho normal sobre fundo branco, usar `--color-gold-text`.
Sobre fundo preto, `--color-gold` já passa em qualquer tamanho.**

**Rationale**: Resolve a FR-014/SC-006 (WCAG AA) antes de qualquer componente ser escrito, em vez
de descobrir falhas de legibilidade depois de todo o redesenho pronto.

**Alternatives considered**: Usar um único tom de dourado em todos os contextos — descartado após o
cálculo mostrar que ele falha AA-normal sobre fundo branco (3.09:1); um dourado mais escuro/opaco
em todos os contextos resolveria o contraste mas perderia o brilho metálico desejado sobre fundo
preto.

## 5. Verificação de contraste durante a implementação

**Decision**: Validar os tokens acima analiticamente (feito nesta pesquisa, tabela acima) e, depois
de implementado, reconferir visualmente via captura de tela do Chromium headless (mesma abordagem
já usada neste projeto para QA visual) comparada manualmente contra a tabela de contraste.

**Rationale**: Barato de verificar na definição dos tokens, antes de qualquer componente ser
escrito; a conferência visual pós-implementação pega casos que a tabela não cobre (ex.: texto sobre
a imagem do hero, onde o fundo não é um token sólido).

**Alternatives considered**: Confiar só em inspeção visual no final — descartado; foi exatamente
esse padrão que, em iterações anteriores deste projeto, só revelou problemas de legibilidade depois
de tudo pronto.

## 6. Origem das fotografias grandes (placeholder)

**Decision**: Usar arquivos de imagem estáticos, versionados localmente em
`frontend/src/assets/categories/` e `frontend/src/assets/products/` — não uma URL de serviço de
placeholder de terceiros (ex.: `picsum.photos`) chamada em runtime. A curadoria/obtenção dos
arquivos de placeholder específicos acontece na fase de implementação (`/speckit-tasks` +
implementação), não neste plano.

**Rationale**: Conforme resolvido na clarificação do spec (FR-004), placeholder é aceitável agora e
fotografia própria substitui depois — mas isso não deve introduzir uma dependência de rede externa
em runtime (risco de indisponibilidade do serviço terceiro, de licenciamento ambíguo de imagens
"hotlinked", e de variabilidade de peso/formato fora do controle do projeto, todos contrários ao
orçamento de performance e à robustez esperada).

**Alternatives considered**: Hotlink direto para um serviço de placeholder de imagens — descartado
pelos motivos acima; bloquear o redesenho até haver fotografia real da marca — já descartado na
clarificação do spec (resposta A: placeholder aceitável agora).
