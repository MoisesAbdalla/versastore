import { describe, it, expect, vi, beforeEach } from "vitest";

const getDocMock = vi.fn();
const setDocMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((db, collectionName, id) => ({ collectionName, id })),
  getDoc: (...args) => getDocMock(...args),
  setDoc: (...args) => setDocMock(...args),
  serverTimestamp: () => "server-timestamp",
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import {
  getHomeSettings,
  setHeroImage,
  setCategoryImage,
  setHeroPosition,
  setCategoryPosition,
  resetHero,
} from "../settingsService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getHomeSettings", () => {
  it("retorna defaults quando o documento não existe (assets padrão, centralizado)", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });

    expect(await getHomeSettings()).toEqual({
      heroImage: null,
      heroPosition: "center",
      categoryImages: {},
      categoryPositions: {},
    });
  });

  it("retorna imagens e posições customizadas quando existem", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        heroImage: "https://img/hero.jpg",
        heroPosition: "top",
        categoryImages: { masculino: "https://img/m.jpg" },
        categoryPositions: { masculino: "bottom right" },
      }),
    });

    const settings = await getHomeSettings();

    expect(settings.heroImage).toBe("https://img/hero.jpg");
    expect(settings.heroPosition).toBe("top");
    expect(settings.categoryImages.masculino).toBe("https://img/m.jpg");
    expect(settings.categoryPositions.masculino).toBe("bottom right");
  });

  it("posição ausente cai para center (docs gravados antes do enquadramento)", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ heroImage: "https://img/hero.jpg" }),
    });

    const settings = await getHomeSettings();

    expect(settings.heroPosition).toBe("center");
    expect(settings.categoryPositions).toEqual({});
  });
});

describe("escrita das configurações", () => {
  it("setHeroImage grava com merge (não apaga as imagens de categoria)", async () => {
    setDocMock.mockResolvedValueOnce(undefined);

    await setHeroImage("https://img/novo-hero.jpg");

    const [ref, data, options] = setDocMock.mock.calls[0];

    expect(ref).toEqual({ collectionName: "settings", id: "home" });
    expect(data.heroImage).toBe("https://img/novo-hero.jpg");
    expect(options).toEqual({ merge: true });
  });

  it("setCategoryImage grava só a chave da categoria (merge profundo)", async () => {
    setDocMock.mockResolvedValueOnce(undefined);

    await setCategoryImage("feminino", "https://img/f.jpg");

    const [, data] = setDocMock.mock.calls[0];

    expect(data.categoryImages).toEqual({ feminino: "https://img/f.jpg" });
  });

  it("setHeroPosition e setCategoryPosition gravam o enquadramento com merge", async () => {
    setDocMock.mockResolvedValue(undefined);

    await setHeroPosition("top");
    await setCategoryPosition("calcados", "bottom left");

    expect(setDocMock.mock.calls[0][1].heroPosition).toBe("top");
    expect(setDocMock.mock.calls[1][1].categoryPositions).toEqual({
      "calcados": "bottom left",
    });
  });

  it("resetHero zera imagem E posição em uma única escrita", async () => {
    setDocMock.mockResolvedValueOnce(undefined);

    await resetHero();

    const [, data] = setDocMock.mock.calls[0];

    expect(data.heroImage).toBe(null);
    expect(data.heroPosition).toBe(null);
    expect(setDocMock).toHaveBeenCalledTimes(1);
  });
});
