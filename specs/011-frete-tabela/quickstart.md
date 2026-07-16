# Quickstart — Frete por Tabela (M5a / 011)

Validação ponta a ponta. Rodar `npm run dev`/`test`/`lint`/`build` em `frontend/`. Referências: [contracts/services.md](contracts/services.md), [contracts/ui.md](contracts/ui.md), [data-model.md](data-model.md).

## Pré-requisitos
- Logado como **admin** (para configurar) e como **cliente** com endereço + carrinho (para o checkout).
- Nenhum deploy de rules necessário (`settings/{id}` já é leitura pública + escrita admin).

## 1. Configurar a tabela (US1)
1. Admin → **Frete** (`/admin/frete`).
2. Adicionar regra "Sudeste" com faixa de CEP (ex.: 01000000–39999999), valor R$19,90, prazo 5 dias; adicionar "Sul", "Nordeste" etc.
3. Definir **frete padrão "demais regiões"** (ex.: R$39,90 / 10 dias) — ou deixar vazio para bloquear.
4. Definir **frete grátis acima de** R$199.
5. Tentar salvar uma faixa malformada / sobreposta → bloqueado com erro; corrigir e salvar.

## 2. Frete no checkout (US2)
1. Cliente com carrinho abaixo de R$199 e um CEP do Sudeste → o resumo mostra **R$ 19,90 · até 5 dias** e **total = subtotal + 19,90**.
2. Trocar o CEP/endereço para outra região → o frete **recalcula**.
3. Subir o subtotal **≥ R$199** → **"Frete grátis"** (R$0), total = subtotal.
4. CEP de região **sem regra**: com padrão definido → usa "demais regiões"; sem padrão → aviso "ainda não entregamos nessa região" e confirmar **bloqueado**.
5. CEP inválido (ViaCEP não encontra) → erro no campo.
6. Confirmar → o pedido grava `shipping` (valor), `shippingEtaDays`, `shippingMethod`, `shippingCep` e `shippingStatus` "calculado"/"gratis"; `total = subtotal + shipping`.

## 3. Banner (US3)
1. Mudar o **limite de frete grátis** no admin para R$150 → o banner do topo passa a mostrar "Frete grátis acima de R$150".

## 4. Congelamento (regressão)
1. Depois de um pedido criado, **alterar a tabela** no admin → o pedido antigo mantém o frete/prazo originais (não recalcula). Ver em "Meus pedidos" e no admin.

## 5. Interface (M5b-ready)
- Confirmar que o checkout chama `shippingProvider.quote` e **não** conhece a fonte (tabela) — o M5b troca a implementação sem tocar o checkout.

## Gates
- `npm run test` verde (util de frete: matching/compute/validação; `useCheckout` recalcula/bloqueia; orderService grava frete); `npm run lint` sem erros; `npm run build` íntegro.
- Regressão: checkout (009), carrinho, conta (007), variações (008), admin, vitrine intactos.

## Pendente para o M5b (não validar aqui)
- API real (Melhor Envio/SuperFrete), opções por transportadora, peso dos produtos, Cloud Function — tudo M5b (depende do Blaze).
