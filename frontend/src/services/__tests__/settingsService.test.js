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

import { getHomeSettings, setHeroImage, setCategoryImage } from "../settingsService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getHomeSettings", () => {
  it("retorna defaults vazios quando o documento não existe (loja usa assets padrão)", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });

    expect(await getHomeSettings()).toEqual({ heroImage: null, categoryImages: {} });
  });

  it("retorna as imagens customizadas quando existem", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        heroImage: "https://img/hero.jpg",
        categoryImages: { masculino: "https://img/m.jpg" },
      }),
    });

    const settings = await getHomeSettings();

    expect(settings.heroImage).toBe("https://img/hero.jpg");
    expect(settings.categoryImages.masculino).toBe("https://img/m.jpg");
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

  it("restaurar padrão grava null (loja volta ao asset embarcado)", async () => {
    setDocMock.mockResolvedValueOnce(undefined);

    await setHeroImage(null);

    expect(setDocMock.mock.calls[0][1].heroImage).toBe(null);
  });
});
