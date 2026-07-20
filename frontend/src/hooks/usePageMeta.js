import { useEffect } from "react";

// Meta tags por página (feature 017 / M8) — sem dependência: aplica title,
// description, Open Graph/Twitter e noindex direto no <head>. Crawlers que
// executam JS (Google) veem a meta por página; os demais veem o default do
// index.html (limitação documentada — research R-1).

const SITE_NAME = "Versa Store";
const DEFAULT_DESCRIPTION =
  "Versa Store — sua loja online com qualidade, tecnologia e confiança.";

function upsertMeta(attr, key, content) {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);

  if (!content) {
    if (tag && tag.dataset.pageMeta === "1") {
      tag.remove();
    }
    return;
  }

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    tag.dataset.pageMeta = "1";
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

export function usePageMeta({ title, description, image, noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    const desc = description || DEFAULT_DESCRIPTION;

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", window.location.href);
    upsertMeta("property", "og:image", image || null);
    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : null);

    return () => {
      // Restaura o estado neutro ao sair da página (a próxima rota reaplica).
      document.title = SITE_NAME;
      upsertMeta("name", "robots", null);
      upsertMeta("property", "og:image", null);
    };
  }, [title, description, image, noindex]);
}
