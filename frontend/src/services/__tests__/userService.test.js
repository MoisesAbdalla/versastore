import { describe, it, expect, vi, beforeEach } from "vitest";

const getDocMock = vi.fn();
const setDocMock = vi.fn();
const updateDocMock = vi.fn();
const docMock = vi.fn((db, collectionName, id) => ({ db, collectionName, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args) => docMock(...args),
  getDoc: (...args) => getDocMock(...args),
  setDoc: (...args) => setDocMock(...args),
  updateDoc: (...args) => updateDocMock(...args),
  serverTimestamp: () => "server-timestamp",
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import {
  getUserProfile,
  ensureUserProfile,
  hasPermission,
  isProfileComplete,
  completeProfile,
  createCustomerProfile,
  saveAddress,
  setDefaultAddress,
  removeAddress,
  saveCpf,
} from "../userService";
import { ROLES } from "../../constants/roles";

beforeEach(() => {
  // Reset das filas de mockResolvedValueOnce entre testes (evita vazamento).
  getDocMock.mockReset();
  setDocMock.mockReset();
  updateDocMock.mockReset();
});

describe("getUserProfile", () => {
  it("retorna role/name/email do documento users/{uid}", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        role: "admin",
        name: "Moisés",
        email: "admin@versastore.com",
        orderCount: 3,
      }),
    });

    const profile = await getUserProfile("uid-123");

    expect(docMock).toHaveBeenCalledWith({}, "users", "uid-123");
    expect(profile).toEqual({
      role: "admin",
      name: "Moisés",
      email: "admin@versastore.com",
    });
  });

  it("retorna null quando o documento não existe (usuário sem perfil)", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });

    expect(await getUserProfile("uid-sem-doc")).toBe(null);
  });

  it("propaga erro do Firestore para o AuthContext tratar", async () => {
    getDocMock.mockRejectedValueOnce(new Error("permission-denied"));

    await expect(getUserProfile("uid-123")).rejects.toThrow("permission-denied");
  });
});

describe("ensureUserProfile", () => {
  it("cria o documento users/{uid} como customer quando não existe (registro novo ou conta antiga)", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });
    setDocMock.mockResolvedValueOnce(undefined);

    const profile = await ensureUserProfile({
      uid: "uid-novo",
      email: "cliente@exemplo.com",
      displayName: "Cliente Exemplo",
    });

    expect(setDocMock).toHaveBeenCalledTimes(1);

    const [docRef, data] = setDocMock.mock.calls[0];

    expect(docRef).toEqual({ db: {}, collectionName: "users", id: "uid-novo" });
    expect(data).toMatchObject({
      name: "Cliente Exemplo",
      nameLower: "cliente exemplo",
      email: "cliente@exemplo.com",
      role: "customer",
      phone: "",
      authProvider: "password",
      addresses: [],
      orderCount: 0,
      totalSpent: 0,
    });

    expect(profile).toMatchObject({
      id: "uid-novo",
      role: "customer",
      name: "Cliente Exemplo",
    });
  });

  it("marca a origem via extra (Google)", async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });
    setDocMock.mockResolvedValueOnce(undefined);

    await ensureUserProfile(
      { uid: "g1", email: "ana@x.com", displayName: "Ana" },
      { authProvider: "google" }
    );

    expect(setDocMock.mock.calls[0][1].authProvider).toBe("google");
  });

  it("não sobrescreve documento existente (preserva role admin no login)", async () => {
    setDocMock.mockClear();
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "admin", name: "Moisés", email: "admin@versastore.com" }),
    });

    const profile = await ensureUserProfile({
      uid: "uid-admin",
      email: "admin@versastore.com",
    });

    expect(setDocMock).not.toHaveBeenCalled();
    expect(profile.role).toBe("admin");
  });
});

describe("isProfileComplete (feature 007)", () => {
  it("completo só com telefone E aceite de termos", () => {
    expect(isProfileComplete({ phone: "119", termsAcceptedAt: "ts" })).toBe(true);
    expect(isProfileComplete({ phone: "", termsAcceptedAt: "ts" })).toBe(false);
    expect(isProfileComplete({ phone: "119", termsAcceptedAt: null })).toBe(false);
    expect(isProfileComplete(null)).toBe(false);
  });
});

describe("createCustomerProfile (escrita autoritativa, I1)", () => {
  it("grava o doc completo com merge, incluindo nome e versão do aceite", async () => {
    setDocMock.mockResolvedValueOnce(undefined);

    await createCustomerProfile("u1", {
      name: "Maria Silva",
      email: "m@x.com",
      phone: "11912345678",
      termsVersion: "2026-07-13",
    });

    const [, data, options] = setDocMock.mock.calls[0];

    expect(options).toEqual({ merge: true });
    expect(data).toMatchObject({
      name: "Maria Silva",
      nameLower: "maria silva",
      role: "customer",
      phone: "11912345678",
      termsVersion: "2026-07-13",
      authProvider: "password",
    });
  });
});

describe("completeProfile (pós-Google)", () => {
  it("grava telefone + aceite + versão", async () => {
    updateDocMock.mockResolvedValueOnce(undefined);

    await completeProfile("u1", { phone: "11912345678", termsVersion: "2026-07-13" });

    const [, changes] = updateDocMock.mock.calls[0];

    expect(changes.phone).toBe("11912345678");
    expect(changes.termsAcceptedAt).toBe("server-timestamp");
    expect(changes.termsVersion).toBe("2026-07-13");
  });
});

describe("endereços — mantêm um único padrão", () => {
  it("saveAddress novo padrão desmarca os demais", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ addresses: [{ id: "a1", isDefault: true }] }),
    });
    updateDocMock.mockResolvedValueOnce(undefined);

    await saveAddress("u1", { id: "a2", isDefault: true });

    const [, changes] = updateDocMock.mock.calls[0];
    const defaults = changes.addresses.filter((a) => a.isDefault);

    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe("a2");
  });

  it("setDefaultAddress marca um e desmarca os outros", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ addresses: [{ id: "a1", isDefault: true }, { id: "a2", isDefault: false }] }),
    });
    updateDocMock.mockResolvedValueOnce(undefined);

    await setDefaultAddress("u1", "a2");

    const [, changes] = updateDocMock.mock.calls[0];

    expect(changes.addresses.find((a) => a.id === "a2").isDefault).toBe(true);
    expect(changes.addresses.find((a) => a.id === "a1").isDefault).toBe(false);
  });

  it("removeAddress promove um novo padrão se o removido era o padrão", async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ addresses: [{ id: "a1", isDefault: true }, { id: "a2", isDefault: false }] }),
    });
    updateDocMock.mockResolvedValueOnce(undefined);

    await removeAddress("u1", "a1");

    const [, changes] = updateDocMock.mock.calls[0];

    expect(changes.addresses).toHaveLength(1);
    expect(changes.addresses[0].isDefault).toBe(true);
  });
});

describe("hasPermission", () => {
  it("admin tem as capacidades do painel", () => {
    expect(hasPermission(ROLES.ADMIN, "products.write")).toBe(true);
    expect(hasPermission(ROLES.ADMIN, "orders.updateStatus")).toBe(true);
  });

  it("customer não tem nenhuma capacidade administrativa", () => {
    expect(hasPermission(ROLES.CUSTOMER, "products.write")).toBe(false);
    expect(hasPermission(ROLES.CUSTOMER, "dashboard.view")).toBe(false);
  });

  it("papel desconhecido/nulo não tem permissões (deny by default)", () => {
    expect(hasPermission(null, "products.write")).toBe(false);
    expect(hasPermission("operator", "products.write")).toBe(false);
  });
});

describe("saveCpf (feature 009, opt-in)", () => {
  it("grava o cpf no doc do próprio usuário", async () => {
    await saveCpf("uid-1", "529.982.247-25");

    expect(docMock).toHaveBeenCalledWith({}, "users", "uid-1");
    expect(updateDocMock).toHaveBeenCalledWith(
      { db: {}, collectionName: "users", id: "uid-1" },
      { cpf: "529.982.247-25" }
    );
  });
});
