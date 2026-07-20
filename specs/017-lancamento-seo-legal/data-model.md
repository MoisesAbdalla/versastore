# Data Model — Bloco de Lançamento (017 / M8)

## Doc `settings/store` (NOVO — leitura pública, escrita admin; rules atuais cobrem)

| Campo | Tipo | Notas |
|---|---|---|
| `razaoSocial` | string | obrigatório p/ lançamento (identificação do fornecedor) |
| `cnpj` | string | obrigatório p/ lançamento; exibido formatado |
| `endereco` | string | obrigatório p/ lançamento (endereço físico completo) |
| `email` | string | contato (mailto: no Contato/rodapé) |
| `telefone` | string | opcional (tel:) |
| `whatsapp` | string | opcional (wa.me, só dígitos com DDI/DDD) |
| `updatedAt` | Timestamp | serverTimestamp no save |

Campos vazios são **omitidos** na exibição. "Pendência de lançamento" no admin quando faltarem razaoSocial/cnpj/endereco.

## Perfil do usuário (existente — sem campo novo)

- `termsVersion` (string|null) e `termsAcceptedAt` (Timestamp|null), do M3.
- **Vigente**: `TERMS_VERSION = "2026-07-19"` (constants/terms.js).
- `needsTermsReaccept(profile)` → `Boolean(profile) && profile.termsVersion !== TERMS_VERSION`.
- `acceptCurrentTerms(uid)` → `updateDoc(users/{uid}, { termsVersion: TERMS_VERSION, termsAcceptedAt: serverTimestamp() })` — permitido pelas rules atuais (usuário edita o próprio doc sem tocar role/agregados).

## Conteúdo legal (código, versionado por commit)

- `src/content/legal/{termos,privacidade,trocas}.jsx` — módulos de conteúdo com a mesma `TERMS_VERSION` exibida; trilha de mudança = git.

## Sitemap/robots (arquivos estáticos publicados)

- `public/sitemap.xml` — gerado no build (`scripts/generate-sitemap.mjs`): páginas fixas + `/product/{id}` dos produtos `status=="ativo" && deleted==false` (REST pública).
- `public/robots.txt` — estático: Disallow /admin, /conta, /checkout, /login, /register, /recuperar-senha, /completar-cadastro, /acesso-negado; Sitemap: URL absoluta.

## Meta por rota (runtime, sem persistência)

`usePageMeta({ title, description, image?, noindex? })` — aplica `document.title`, `meta[name=description]`, `og:title/description/image/url`, `twitter:card` e `meta[name=robots]` (noindex) no `<head>`; restaura defaults ao desmontar.

## Regras / Índices

- **Nenhuma mudança** em `firestore.rules` ou `firestore.indexes.json` nesta feature.
