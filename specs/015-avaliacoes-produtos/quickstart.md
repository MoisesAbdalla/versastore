# Quickstart — Avaliações de Produtos (015)

Validação ponta a ponta. Rodar `npm run dev`/`test`/`lint`/`build` em `frontend/`. Referências: [contracts/services.md](contracts/services.md), [contracts/ui.md](contracts/ui.md), [data-model.md](data-model.md).

## Pré-requisitos
- **Deploy manual** (passo do lojista): `firebase deploy --only firestore:rules,firestore:indexes` — a regra da coleção `reviews` e os 2 índices novos (reviews aprovadas por produto; verificação de compra).
- Logado como **admin** (moderar) e como **cliente** que **comprou** um produto (um pedido não cancelado com o item — dá pra criar um pedido e, como admin, marcar como pago/entregue no M4a).

## 1. Cliente avalia (US1)
1. Como cliente **que comprou** o produto X, abra a página de X → veja o formulário de avaliação.
2. Dê **4 estrelas** + comentário e envie → confirmação; a avaliação fica **pendente** (selo "Em análise" só para você).
3. Reabra → sua avaliação aparece; **edite** para 5 estrelas → volta a pendente.
4. Sem nota → bloqueia; comentário acima do limite → recusado.
5. Como cliente **que NÃO comprou** X → vê "Só quem comprou pode avaliar" (sem form). Deslogado → "Entre para avaliar".

## 2. Lojista modera (US2)
1. Admin → **Avaliações** (`/admin/avaliacoes`) → veja as **pendentes** com contador.
2. **Aprovar** a avaliação de X → ela some das pendentes e a **média/contagem** de X são atualizadas.
3. **Ocultar** / **Remover** uma aprovada → a média recalcula (só conta aprovadas).

## 3. Exibição (US3)
1. Página de X → **média + contagem** no topo e a **lista** das aprovadas (nota, comentário, nome, data); **Ver mais** pagina.
2. Vitrine/catálogo → o **card de X** mostra as estrelas + contagem.
3. Produto **sem** avaliações → "Ainda sem avaliações" / estrelas neutras (sem estrela quebrada).

## 4. Segurança (regressão)
1. Como cliente, tentar aprovar a própria avaliação (via app) não é possível — editar sempre volta a **pendente**.
2. Uma avaliação **pendente/oculta** não aparece na vitrine nem na página para outros clientes.

## Gates
- `npm run test` verde (util rating: média/arredondamento/estrelas/validação; reviewService: submit/aprovar/ocultar/remover + recompute + hasPurchased/paginação); `npm run lint` sem erros; `npm run build` íntegro.
- Regressão: vitrine, produto, checkout (009), frete (011), cupons (013), lista de desejos (014), carrinho, conta, admin intactos.

## Pendente para o M4b (não validar aqui)
- Endurecimento server-side da "compra verificada" e da moderação/agregado (webhook/Function confiável) — depende do Blaze.
