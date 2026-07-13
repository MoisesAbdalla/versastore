import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  uploadImageWithRetry,
  validateImageFile,
  cloudinaryUrl,
  IMAGE_WIDTHS,
} from "../cloudinaryService";

describe("cloudinaryUrl", () => {
  const base =
    "https://res.cloudinary.com/stmjt15v/image/upload/v123/versa-store/abc.jpg";

  it("insere f_auto,q_auto,w_ logo após /upload/", () => {
    expect(cloudinaryUrl(base, { w: IMAGE_WIDTHS.card })).toBe(
      "https://res.cloudinary.com/stmjt15v/image/upload/f_auto,q_auto,w_400/v123/versa-store/abc.jpg"
    );
  });

  it("sem largura, aplica só f_auto,q_auto", () => {
    expect(cloudinaryUrl(base)).toBe(
      "https://res.cloudinary.com/stmjt15v/image/upload/f_auto,q_auto/v123/versa-store/abc.jpg"
    );
  });

  it("anexa transformação extra quando informada", () => {
    expect(cloudinaryUrl(base, { w: 800, extra: "c_fill" })).toContain(
      "f_auto,q_auto,w_800,c_fill"
    );
  });

  it("retorna URL não-Cloudinary inalterada (fallback seguro)", () => {
    expect(cloudinaryUrl("https://exemplo.com/foto.png", { w: 400 })).toBe(
      "https://exemplo.com/foto.png"
    );
    expect(cloudinaryUrl("", { w: 400 })).toBe("");
    expect(cloudinaryUrl(null)).toBe("");
  });
});

function makeFile({ type = "image/jpeg", size = 1024 } = {}) {
  return { type, size, name: "foto.jpg" };
}

function okResponse(url = "https://res.cloudinary.com/img.jpg") {
  return {
    ok: true,
    json: async () => ({ secure_url: url }),
  };
}

describe("validateImageFile", () => {
  it("aceita JPG, PNG e WebP dentro do limite", () => {
    expect(() => validateImageFile(makeFile({ type: "image/png" }))).not.toThrow();
    expect(() => validateImageFile(makeFile({ type: "image/webp" }))).not.toThrow();
  });

  it("rejeita formato não suportado", () => {
    expect(() => validateImageFile(makeFile({ type: "image/gif" }))).toThrow(/Formato inválido/);
  });

  it("rejeita arquivo acima de 5 MB", () => {
    expect(() => validateImageFile(makeFile({ size: 6 * 1024 * 1024 }))).toThrow(/5 MB/);
  });
});

describe("uploadImageWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.FormData = class {
      append() {}
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retorna a URL na primeira tentativa bem-sucedida", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const url = await uploadImageWithRetry(makeFile());

    expect(url).toBe("https://res.cloudinary.com/img.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tenta de novo com backoff após falha e sucede na segunda", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const promise = uploadImageWithRetry(makeFile());

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe("https://res.cloudinary.com/img.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falha com código upload-falhou após esgotar as 3 tentativas", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    const promise = uploadImageWithRetry(makeFile());
    const assertion = expect(promise).rejects.toMatchObject({ code: "upload-falhou" });

    await vi.advanceTimersByTimeAsync(1000 + 2000);
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("não consome tentativas de rede com arquivo inválido", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadImageWithRetry(makeFile({ type: "text/plain" }))).rejects.toMatchObject({
      code: "arquivo-invalido",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
