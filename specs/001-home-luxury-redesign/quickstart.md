# Quickstart: Validando o Redesenho Premium/Luxo da Home

Guia para rodar e validar a feature de ponta a ponta depois de implementada. Não duplica os tokens
(ver [data-model.md](./data-model.md)) nem as decisões técnicas (ver [research.md](./research.md)).

## Pré-requisitos

- Node.js + npm instalados
- Repo em `c:\VersaStore`, dependências já instaladas em `frontend/` (`npm install` se necessário)

## Rodar

```bash
cd frontend
npm run dev
```

Abra a URL impressa pelo Vite (ex.: `http://localhost:5173`).

## Roteiro de validação (mapeado às User Stories do spec)

### 1. Primeira impressão premium (US1 / FR-001–003, FR-014)

- [ ] A Home carrega com um hero em tela cheia: imagem estática de produto em alta resolução, uma
      tag, um título, uma frase curta, uma chamada para ação — nada além disso sobreposto.
- [ ] Nenhum azul `#1E3A8A` ou laranja `#F97316` aparece em nenhum ponto da Home.
- [ ] Títulos de seção ("Categorias", "Produtos em Destaque") usam letter-spacing perceptível e
      tamanho maior que o texto corrido.
- [ ] Checagem de contraste: usando as cores computadas na página (DevTools "Inspect" ou uma
      extensão de contraste), confirmar que texto normal ≥ 4.5:1 e texto grande ≥ 3:1 contra o
      fundo correspondente — nenhum texto viola a tabela de `research.md` §4.

### 2. Header minimalista e navegação enxuta (US2 / FR-006, FR-013)

- [ ] A logo "Versa Store" aparece em tratamento tipográfico/minimalista — sem emoji, sem ícone
      multicolorido.
- [ ] O menu de navegação tem no máximo 3–4 itens; "Contato" e "Promoções" NÃO aparecem nele.
- [ ] Ícones de busca, conta, favoritos e carrinho são monocromáticos (preto/branco/dourado), não
      azul/laranja.
- [ ] Abrir o site em uma rota diferente da Home (ex.: login) e confirmar que o mesmo Header/Navbar/
      Footer redesenhados aparecem — o redesenho é site-wide (decisão da clarificação).

### 3. Categorias e produtos como vitrine editorial (US3 / FR-004–005, FR-007, FR-009)

- [ ] Cada categoria aparece como uma foto grande (não ícone ilustrativo/emoji).
- [ ] "Produtos em Destaque" aparece em um carrossel; passar o mouse sobre um card produz um leve
      zoom com transição suave (sem animação brusca).
- [ ] Com o catálogo atual (2 produtos, cabem na tela), os controles de avançar/voltar do carrossel
      ficam **ocultos** (não desabilitados-visíveis).
- [ ] Navegar o carrossel só com teclado (Tab até os controles, Enter/Espaço para ativar) — quando
      os controles estiverem visíveis, devem funcionar sem mouse.
- [ ] O espaçamento entre Hero, Categorias, Produtos em Destaque e Rodapé é visivelmente maior que
      no design anterior.

### 4. Rodapé (FR-008)

- [ ] O Rodapé mostra "Contato" e "Promoções" como links (agora fora do menu principal).
- [ ] O formulário de newsletter tem um checkbox de consentimento **não pré-marcado** com link para
      a política de privacidade; o botão de inscrição fica desabilitado até o checkbox ser marcado.
- [ ] Links de redes sociais estão presentes e estilizados conforme a nova paleta.

### 5. Responsividade (FR-010)

- [ ] Testar em pelo menos 3 larguras: ~360px (mobile), ~768px (tablet), ≥1440px (desktop).
- [ ] Em nenhuma largura o texto do hero se sobrepõe ilegivelmente à imagem, nem há corte de
      conteúdo ou sobreposição quebrada em Categorias/Produtos/Rodapé.

### 6. Firebase / autenticação (FR-012)

- [ ] Com sessão não autenticada, o Header mostra "Entrar" (com o novo tratamento visual).
- [ ] Autenticar e confirmar que o Header passa a mostrar o e-mail do usuário / opção de logout,
      com o mesmo tratamento visual — sem regressão funcional no fluxo de auth.

## Checagens automatizadas

```bash
cd frontend
npm run lint       # oxlint MUST continuar limpo (Constituição I)
```

Não há suíte de testes automatizados configurada ainda no projeto; esta feature não introduz
lógica de pedido/pagamento/estoque/autenticação, então a Constituição (II) não a torna obrigatória
aqui — mas ver a recomendação em `plan.md` (Vitest + RTL para o carrossel e o gate de consentimento
da newsletter) se o time optar por adicioná-la.

## Prova de performance (SC-002)

Usar o DevTools Performance/Lighthouse (ou throttling manual "Fast 3G" + CPU 4x slowdown) na Home:
confirmar que a página fica interativa em menos de 3 segundos nesse perfil, mesmo com o hero e as
fotos grandes de categoria/produto carregando.
