import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";

import { usePageMeta } from "../usePageMeta";

function metaContent(selector) {
  return document.head.querySelector(selector)?.getAttribute("content") ?? null;
}

describe("usePageMeta", () => {
  it("aplica title com sufixo da loja e description", () => {
    renderHook(() => usePageMeta({ title: "Produtos", description: "Catálogo completo" }));

    expect(document.title).toBe("Produtos · Versa Store");
    expect(metaContent('meta[name="description"]')).toBe("Catálogo completo");
    expect(metaContent('meta[property="og:title"]')).toBe("Produtos · Versa Store");
  });

  it("noindex injeta meta robots; sem noindex, remove", () => {
    const { unmount } = renderHook(() => usePageMeta({ title: "Conta", noindex: true }));
    expect(metaContent('meta[name="robots"]')).toBe("noindex, nofollow");

    unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("imagem vira og:image + twitter card grande", () => {
    renderHook(() => usePageMeta({ title: "Tênis", image: "https://img/x.jpg" }));

    expect(metaContent('meta[property="og:image"]')).toBe("https://img/x.jpg");
    expect(metaContent('meta[name="twitter:card"]')).toBe("summary_large_image");
  });

  it("ao desmontar restaura o title neutro", () => {
    const { unmount } = renderHook(() => usePageMeta({ title: "Sobre" }));
    unmount();
    expect(document.title).toBe("Versa Store");
  });
});
