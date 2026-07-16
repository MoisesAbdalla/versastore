# Research — Frete por Tabela (M5a / 011)

Decisões (Fase 0). Formato: Decisão / Racional / Alternativas.

## R-1 — Configuração em `settings/shipping`

**Decisão**: guardar a config de frete num único doc `settings/shipping`, no padrão do `settingsService` (aparência da Home, feature 004): `getShippingSettings()` / `updateShippingSettings()`. Shape: `{ rules: [...], defaultRule: {...}|null, freeShippingThreshold: number|null }`.

**Racional**: `settings/{id}` já tem **leitura pública + escrita admin** nas rules — o checkout e o banner leem, o admin escreve, **sem mudança de rules**. Reusa o cache-de-módulo do padrão de settings (uma leitura por carregamento).

**Alternativas**: coleção `shippingRules` — rejeitada (mais rules/índices; a config é pequena e única).

## R-2 — Região por faixa de CEP + ViaCEP para validar/exibir

**Decisão**: cada regra tem um nome de região + **faixas de CEP numéricas** (`{ from, to }`). O cálculo casa o CEP (só dígitos → número) contra as faixas. **ViaCEP** (reuso do `cepService`, M3) valida que o CEP existe e traz cidade/UF para exibir ("Enviar para São Paulo/SP"); a **identificação da regra é por faixa de CEP**, não por UF.

**Racional**: faixas de CEP dão ao lojista controle fino (o próprio texto do usuário pede "faixa de CEP"); ViaCEP evita aceitar CEP inexistente e melhora a UX. Independe de uma tabela fixa UF→região.

**Alternativas**: mapear UF→região (mais rígido); só ViaCEP sem faixas (não dá controle de faixa) — rejeitadas.

## R-3 — Ordem de cálculo do frete

**Decisão** (determinística):
1. **Frete grátis**: se `freeShippingThreshold` definido e `subtotal ≥ threshold` → frete **R$0** (prevalece sobre tudo).
2. Senão, **regra específica**: primeira regra cuja faixa de CEP contém o CEP **e** (se a regra tem faixa de valor) o subtotal está na faixa → usa `price`/`etaDays` dela.
3. Senão, **frete padrão** `defaultRule` (se definido) → `price`/`etaDays`.
4. Senão → **sem regra**: bloqueia a finalização com aviso (FR-010).

**Racional**: cobre frete grátis, regra por região+valor, catch-all e o caso sem cobertura, de forma previsível. A validação da tabela impede sobreposição ambígua; havendo empate, vale a **primeira** (ordem da lista, que o lojista controla).

**Alternativas**: menor preço entre regras casadas — rejeitada (menos previsível para o lojista; a M5b/API é que traz múltiplas opções).

## R-4 — Interface `shippingProvider` (pronta para o M5b)

**Decisão**: `services/shippingProvider.js` com `quote({ cep, subtotal }) -> { ok, options?, error? }`, onde `options: [{ method, price, etaDays, free }]`. Na M5a a implementação por **tabela** devolve **uma** opção (a regra aplicável ou o frete grátis) ou `{ ok:false, error:"sem_regra" }`. O checkout consome as opções (na M5a, seleção automática da única). A M5b troca a implementação por uma que consulta a API (várias opções: PAC/SEDEX/…), **sem** mudar o checkout.

**Racional**: contrato já no formato "lista de opções" que o M5b precisa; isola o cálculo (FR-013). Espelha o `paymentProvider` da M4a.

**Alternativas**: retornar um único valor — rejeitada (M5b teria de reescrever a assinatura).

## R-5 — Persistência congelada no pedido

**Decisão**: `createOrder` aceita e grava `shipping` (valor), `shippingEtaDays`, `shippingMethod` (região/rótulo) e `shippingCep`; `shippingStatus` passa de `a_calcular` para `"calculado"` (ou `"gratis"`). `total = subtotal + (shipping||0)` (já preparado na M4a). O frete fica **congelado** — alterar a tabela depois não muda pedidos existentes.

**Racional**: o histórico do pedido não pode mudar retroativamente; a M4a já deixou `shipping`/`total`/`shippingStatus` no doc.

**Alternativas**: recalcular na exibição — rejeitada (quebra histórico e depende da tabela atual).

## R-6 — Banner de frete grátis conectado ao limite

**Decisão**: o `TopBar` passa a ler `freeShippingThreshold` (via `useShippingSettings`, cache de módulo) e exibir "Frete grátis acima de R$X"; sem limite configurado, o banner some (ou vira genérico).

**Racional**: coerência da vitrine com a regra real (SC-003); barato.

**Alternativas**: manter fixo — é o defeito que a feature corrige.

## R-7 — Validação da tabela no admin

**Decisão**: util `validateShippingSettings` (reusado por form e, defensivamente, no save): faixas de CEP bem formadas (`from ≤ to`, 8 dígitos), valor/prazo preenchidos e ≥ 0, e **sem sobreposição** de faixas de CEP entre regras (para o matching ser inequívoco). Erros campo a campo.

**Racional**: FR-004; garante que o cálculo seja determinístico.

## Resumo de impacto
- **Sem** mudança de rules, **sem** novos índices, **sem** backend. Novo doc `settings/shipping`.
- Pedido ganha campos de frete congelados (aditivo); `total` já era `subtotal + shipping` (M4a).
- Cálculo atrás de interface (`shippingProvider`) para o M5b plugar a API. Peso fica para o M5b.
