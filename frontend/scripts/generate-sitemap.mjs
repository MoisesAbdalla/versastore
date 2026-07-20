// Gera public/sitemap.xml no build (feature 017 / M8): páginas fixas + produtos
// ativos, lidos da API REST pública do Firestore (as rules permitem ler produto
// status=="ativo" && deleted==false sem autenticação — mesma visibilidade da
// vitrine). Sem servidor e sem credenciais. Falha de rede NÃO quebra o build:
// mantém o sitemap anterior (ou só as páginas fixas) e avisa no log.
//
// Ajuste BASE_URL quando houver domínio próprio (hoje: domínio padrão do Hosting).
import { writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROJECT_ID = "versa-store-2eb1a";
const BASE_URL = `https://${PROJECT_ID}.web.app`;

const STATIC_PATHS = ["/", "/products", "/sobre", "/contato", "/termos", "/privacidade", "/trocas"];

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sitemap.xml");

async function fetchActiveProductIds() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: "products" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "ativo" } } },
            { fieldFilter: { field: { fieldPath: "deleted" }, op: "EQUAL", value: { booleanValue: false } } },
          ],
        },
      },
      select: { fields: [{ fieldPath: "__name__" }] },
      limit: 5000,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Firestore REST ${response.status}`);
  }

  const rows = await response.json();

  return rows
    .filter((row) => row.document?.name)
    .map((row) => row.document.name.split("/").pop());
}

function buildXml(paths) {
  const urls = paths
    .map((path) => `  <url><loc>${BASE_URL}${path}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

try {
  const ids = await fetchActiveProductIds();
  const paths = [...STATIC_PATHS, ...ids.map((id) => `/product/${id}`)];

  writeFileSync(OUT, buildXml(paths));
  console.log(`[sitemap] gerado com ${STATIC_PATHS.length} páginas fixas + ${ids.length} produtos.`);
} catch (error) {
  if (existsSync(OUT)) {
    console.warn(`[sitemap] falha ao consultar produtos (${error.message}) — mantendo o sitemap existente.`);
  } else {
    writeFileSync(OUT, buildXml(STATIC_PATHS));
    console.warn(`[sitemap] falha ao consultar produtos (${error.message}) — gerado só com as páginas fixas.`);
  }
}
