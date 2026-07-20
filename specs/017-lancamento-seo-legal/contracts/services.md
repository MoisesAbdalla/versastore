# Contracts — Serviços & Utilitários (017)

## `constants/terms.js` (ALTERADO)

```js
export const TERMS_VERSION = "2026-07-19";  // sobe com os textos novos (era 2026-07-13)

// Precisa re-aceitar? null/versão antiga → true. Perfil ausente (deslogado) → false.
export function needsTermsReaccept(profile): boolean
```

## `services/userService.js` (ALTERADO)

```js
// Registra o aceite da versão vigente (re-aceite ou aceite normal).
export async function acceptCurrentTerms(uid): Promise<void>
// updateDoc(users/{uid}, { termsVersion: TERMS_VERSION, termsAcceptedAt: serverTimestamp() })
```

## `services/settingsService.js` (ALTERADO)

```js
// Doc settings/store. Default: todos os campos "".
export async function getStoreSettings(): Promise<StoreSettings>
export async function updateStoreSettings(changes): Promise<void>  // setDoc merge + updatedAt
```

## `hooks/useStoreSettings.js` (NOVO)

```js
// Cache de módulo (padrão useShippingSettings). Para Footer/Contato/Sobre.
export function useStoreSettings(): StoreSettings & { loading }
```

## `hooks/usePageMeta.js` (NOVO)

```js
// Aplica meta no <head> ao montar/atualizar; restaura os defaults ao desmontar.
export function usePageMeta({ title, description, image, noindex }): void
// title → document.title ("X · Versa Store"); description → meta[name=description];
// og:title/og:description/og:image/og:url + twitter:card; noindex → meta[name=robots].
```

## `components/TermsGate/index.jsx` (NOVO)

```jsx
// Envolve as áreas privadas. Deslogado ou versão vigente → children direto.
// needsTermsReaccept(profile) → tela de re-aceite (links p/ os 3 documentos +
// checkbox + aceitar) no lugar dos children; aceitar → acceptCurrentTerms +
// reloadProfile → children.
<TermsGate>{children}</TermsGate>
```

`routes/PrivateRoute.jsx` passa a renderizar `<TermsGate>{children}</TermsGate>` (cobre `/conta/*` e `/checkout*`).

## `scripts/generate-sitemap.mjs` (NOVO — roda no prebuild)

```
1. POST runQuery na REST pública do Firestore: products where status=="ativo" && deleted==false (só ids).
2. Gera public/sitemap.xml: BASE_URL + rotas fixas (/, /products, /sobre, /contato,
   /termos, /privacidade, /trocas) + /product/{id}.
3. Falha de rede → mantém o sitemap existente e loga aviso (build não quebra).
package.json: "prebuild": "node scripts/generate-sitemap.mjs" (BASE_URL constante no script).
```

## Testes (Princípio II — aceite toca o perfil/auth)

- `constants/__tests__/terms.test.js` (ou junto do gate): needsTermsReaccept — null → true; "2026-07-13" → true; vigente → false; profile null → false.
- `services/__tests__/userService.test.js` (estender): acceptCurrentTerms grava versão vigente + timestamp.
- `components/__tests__/TermsGate.test.jsx`: deslogado → children; versão antiga → tela de aceite (children ocultos); aceitar → chama acceptCurrentTerms/reloadProfile e libera; versão vigente → children.
- `hooks/__tests__/usePageMeta.test.js`: aplica title/description/noindex; limpa ao desmontar.
