# Versa Store - Design System

## Visão

A Versa Store possui uma identidade moderna, minimalista e tecnológica.

Nosso objetivo é transmitir:

- Confiança
- Velocidade
- Tecnologia
- Segurança
- Elegância

---

# Paleta de Cores

Redesenho premium/luxo (2026-07-10): a paleta passou de azul/laranja para preto/branco + um
acento metálico dourado, inspirada em e-commerce de moda de grife. Ver
`specs/001-home-luxury-redesign/research.md` §4 para o cálculo de contraste que embasa os
valores abaixo.

## Primary

Preto

#0B0B0C (`--primary`)

Utilização:

- TopBar, Header (fundo), Footer
- Estados de hover sólidos (ex.: card de categoria)
- Texto de preço em destaque

Contraste: 19.67:1 contra branco — passa WCAG AA em qualquer tamanho de texto.

---

## Secondary (dourado)

Dourado

#B08D57 (`--secondary`) — acentos, texto grande, bordas/ícones, texto de qualquer tamanho sobre
fundo preto (contraste 6.36:1)

#8C6D3F (`--gold-text`) — texto dourado de **tamanho normal sobre fundo branco** (contraste
4.80:1). `--secondary` sozinho só passa AA sobre branco em texto grande (≥24px ou ≥18.66px
bold — contraste 3.09:1); não usar `--secondary` para texto normal sobre branco.

Utilização:

- Tags, CTAs, badges, sublinhados, ícones ativos
- Preço em destaque sobre fundo branco → usar `--gold-text`, não `--secondary`

---

## Success

#22C55E

Pedidos pagos
Produto disponível

---

## Error

#EF4444

Erros
Estoque esgotado

---

## Background

#FFFFFF (`--background`)

O tom bege anterior (#E8E6E0, ligado à logo antiga) foi descartado — a logo foi refeita como
um lockup tipográfico (ver seção Logo) e a paleta preto/branco/dourado usa branco puro como
fundo padrão da página.

---

## Surface

#FFFFFF (`--surface`) — mesma cor do Background; a separação entre superfícies vem de borda
fina (`--border`), não de contraste de cor ou sombra.

---

## Text Primary

#0B0B0C (`--text`) — 19.67:1 contra branco.

---

## Text Secondary

#5C5C5C (`--text-muted`) sobre fundo branco — 6.69:1.

#B5B5B5 (`--text-muted-inverse`) sobre fundo preto — 9.59:1.

---

# Border

#E3E3E0 (`--border`) sobre fundo branco.

`rgba(255,255,255,.14)` (`--border-inverse`) sobre fundo preto.

---

# Border Radius

0 (`--radius`)

Cantos totalmente retos — sem nenhum arredondamento — em botões, inputs, cards de
produto/categoria e tags.

Exceções permitidas: elementos circulares deliberados (ex.: botão de favorito) continuam
`border-radius: 50%` — isso não é "arredondamento de canto", é uma forma circular
intencional.

---

# Sombras

`--shadow: 0 1px 3px rgba(11,11,12,.06)`

Sombras devem ser discretas ou ausentes. Prefira bordas finas (`--border`) a sombras para
separar superfícies (cards de produto, header). Menus e modais podem usar `--shadow` para
indicar elevação, mas nunca sombras pesadas/difusas.

---

# Tipografia de Apoio (labels, tags, categorias)

`letter-spacing: .14em` (`--tracking`) + `text-transform: uppercase` + peso 600, tamanho
11–14px.

Usado em: título de seções ("Categorias", "Produtos em Destaque"), tag de destaque do hero,
rótulo de categoria no card de produto, botões de ação (Comprar, Entrar). Dá o tom
editorial/premium mantendo a paleta de cores existente.

---

# Espaçamentos

4

8

12

16

24

32

48

64

---

# Fonte

**Títulos (`--font-heading`)**: Playfair Display (serifada, alto contraste) — Google Fonts,
licença SIL OFL 1.1, self-hosted em `frontend/src/assets/fonts/`.
Fallback: Georgia, "Times New Roman", serif.

**Corpo/UI (`--font-body`)**: Inter (sans-serif) — Google Fonts, licença SIL OFL 1.1,
self-hosted em `frontend/src/assets/fonts/`.
Fallback: -apple-system, "Segoe UI", Roboto, sans-serif.

Ambas carregadas via `@font-face` com `font-display: swap` (nunca bloqueiam o primeiro paint
esperando o download da fonte) — ver `frontend/src/styles/globals.css`. Substituem Poppins
(que não chegou a ser self-hosted no projeto).

---

# Botões

Primary

Secondary

Outlined

Danger

Success

---

# Inputs

Borda reta (`--radius: 0`)

Focus: borda `--primary` (preto)

Erro vermelho (`--error`, inalterado)

---

# Cards

Produto

Categoria

Pedido

Usuário