# Contracts — UI (017)

## Rodapé (`components/Footer` — ALTERADO)

- **Institucional**: links reais — Quem somos (/sobre), Contato (/contato), Termos de uso (/termos), Política de privacidade (/privacidade).
- **Atendimento**: Trocas e devoluções (/trocas), Meus pedidos (/conta/pedidos).
- **Identificação** (novo bloco, acima do copyright): `Razão Social · CNPJ 00.000.000/0000-00` / endereço / contato — de `settings/store`; campos vazios omitidos; bloco some se tudo vazio.
- Corrige o link quebrado `/privacy` → ROUTES.PRIVACIDADE. Newsletter permanece.

## Páginas institucionais (NOVAS, layout MainLayout + PageContainer)

- **/sobre** (`pages/About`): texto institucional da Versa Store (marca, proposta, diferenciais); dados da empresa ao final (de settings/store). Meta própria.
- **/contato** (`pages/Contact`): canais de `settings/store` — e-mail (mailto:), WhatsApp (wa.me), telefone (tel:), endereço; sem formulário. Estado "canais ainda não configurados" se vazio. Meta própria.

## Páginas legais

- **/termos** e **/privacidade**: substituem o placeholder pelo conteúdo de `content/legal` (tipografia atual das páginas Legal); cabeçalho com versão vigente + data; rodapé de minuta ("documento modelo — revise com seu jurídico").
- **/trocas** (`pages/Legal/Returns` — NOVA): política de trocas e devoluções com o **direito de arrependimento de 7 dias (CDC art. 49)** em bloco destacado no topo; instruções de como exercer (prazo, canal, reembolso incluindo frete); casos de defeito (30/90 dias CDC art. 26).
- **Checkout**: linha discreta antes do botão de confirmar — "Ao confirmar, você concorda com os [Termos] e a [Política de trocas] (arrependimento em até 7 dias)".

## Gate de re-aceite (`components/TermsGate` — NOVO)

- Tela no lugar do conteúdo privado: título "Atualizamos nossos termos", resumo curto, links para os 3 documentos (abrem em nova aba), checkbox "Li e aceito os Termos de uso, a Política de privacidade e a Política de trocas (versão YYYY-MM-DD)", botão **Aceitar e continuar** (desabilitado sem o check; estado salvando/erro).
- Aparece em `/conta/*` e `/checkout*` (via PrivateRoute) para usuário com versão antiga/nula; nunca na navegação pública.

## Admin — "Dados da loja" (`/admin/loja`, NOVA)

- Campos: Razão social, CNPJ (máscara), Endereço completo, E-mail, Telefone, WhatsApp. Salvar → `updateStoreSettings` + toast.
- **Aviso de pendência** no topo quando razaoSocial/cnpj/endereco vazios: "Preencha os dados da empresa antes de lançar a loja — eles aparecem no rodapé (exigência do e-commerce)."
- Item de nav "Dados da loja" (ícone Business/Store), perto de Aparência.

## SEO por rota (usePageMeta)

| Rota | title | noindex |
|---|---|---|
| / | "Versa Store — qualidade, tecnologia e confiança" + description | não |
| /products | "Produtos · Versa Store" (+ categoria/busca quando houver) | não |
| /product/:id | "{nome} · Versa Store" + description do produto + og:image (imagem) | não |
| /sobre /contato /termos /privacidade /trocas | títulos próprios | não |
| /cart | "Carrinho · Versa Store" | não |
| /checkout* /conta/* /login /register /admin/* etc. | títulos próprios | **sim** |

`index.html`: title/description/OG default da loja (fallback para crawlers sem JS).

## Design system

`docs/design-system.md` ganha a seção **Lançamento (SEO/institucional/legal)**: rodapé com identificação, páginas novas, gate de re-aceite, meta por rota.
