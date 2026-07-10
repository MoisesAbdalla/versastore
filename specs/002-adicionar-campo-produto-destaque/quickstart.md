# Quickstart: Validando Produto em Destaque (Admin + Home)

Guia para rodar e validar a feature de ponta a ponta depois de implementada. Não duplica os
contratos (ver [contracts/product-service.md](./contracts/product-service.md)) nem o modelo de dados
(ver [data-model.md](./data-model.md)).

## Pré-requisitos

- Node.js + npm instalados; `frontend/` com dependências instaladas (`npm install`, incluindo as
  novas devDependencies de teste desta feature).
- Projeto Firebase configurado (já existente — `frontend/src/firebase/config.js`), com acesso de
  escrita à coleção `products` (necessário para testar o cadastro/edição de verdade).

## Rodar

```bash
cd frontend
npm run dev
```

## Rodar os testes

```bash
cd frontend
npm run test
```

O teste da função `updateProduct` (ou do fluxo de salvar da edição) alterando `estoque` MUST passar
— é o teste exigido pela Constituição (II) para esta feature.

## Roteiro de validação (mapeado às User Stories do spec)

### 1. Marcar produto como destaque ao cadastrar (US1 / FR-001, FR-002)

- [ ] Em `/admin`, o formulário de cadastro mostra o checkbox "Marcar como produto em destaque".
- [ ] Cadastrar um produto com o checkbox marcado → no Firestore, o documento criado tem
      `destaque: true`.
- [ ] Cadastrar um produto **sem** marcar o checkbox → o documento criado tem `destaque: false`
      (nunca ausente/indefinido).
- [ ] Após salvar com sucesso, o formulário limpa e o checkbox volta desmarcado.

### 2. Home exibe produtos em destaque reais, embaralhados (US2 / FR-004–006)

- [ ] Com pelo menos 3 produtos marcados como destaque no Firestore, carregar a Home: a seção
      "Produtos em Destaque" mostra exatamente esses produtos (nenhum produto com `destaque` ausente
      ou `false`).
- [ ] Recarregar a Home 2–3 vezes seguidas: a ordem dos produtos varia entre os carregamentos (não é
      sempre idêntica).
- [ ] Desmarcar o destaque de todos os produtos (ou zerar o conjunto) e recarregar a Home: a seção
      mostra a mensagem de estado vazio ("Em breve") no lugar do carrossel, sem quebrar o resto da
      página.
- [ ] Um produto sem `oldPrice`/`rating` (todos os produtos reais, já que esses campos não existem
      no formulário) renderiza corretamente no card, sem erro no console.

### 3. Editar um produto já cadastrado (US3 / FR-003, FR-003a, FR-003b, FR-003c)

- [ ] Em `/admin`, a área de listagem mostra os produtos já cadastrados (nome + indicação de
      destaque).
- [ ] Selecionar um produto abre a edição pré-preenchida com os valores atuais (todos os campos).
- [ ] Ativar o destaque de um produto sem destaque e salvar → `destaque: true` no Firestore, demais
      campos inalterados.
- [ ] Desativar o destaque de um produto em destaque e salvar → `destaque: false` no Firestore,
      demais campos inalterados.
- [ ] Alterar preço/estoque/descrição e salvar → Firestore reflete os novos valores, mesmo `id` do
      documento (não duplica o produto).
- [ ] Editar um produto **sem** selecionar uma imagem nova e salvar → a imagem original permanece
      (nenhuma chamada de upload ao Cloudinary acontece; a URL salva não muda).

## Checagens automatizadas

```bash
cd frontend
npm run lint       # oxlint MUST continuar limpo (Constituição I)
npm run test        # Vitest MUST passar, incluindo o teste de updateProduct/estoque (Constituição II)
```

## Regressão do fluxo existente (SC-005)

- [ ] O cadastro de produto (campos anteriores: nome, categoria, preço, estoque, descrição, imagem)
      continua funcionando exatamente como antes desta feature, com o checkbox de destaque como
      único acréscimo visível.
