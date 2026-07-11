import { describe, it, expect, vi } from "vitest";

const getDocMock = vi.fn();
const setDocMock = vi.fn();
const docMock = vi.fn((db, collectionName, id) => ({ db, collectionName, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args) => docMock(...args),
  getDoc: (...args) => getDocMock(...args),
  setDoc: (...args) => setDocMock(...args),
  serverTimestamp: () => "server-timestamp",
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import { getUserProfile, ensureUserProfile, hasPermission } from "../userService";
import { ROLES } from "../../constants/roles";

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
    expect(data).toEqual({
      name: "Cliente Exemplo",
      nameLower: "cliente exemplo",
      email: "cliente@exemplo.com",
      role: "customer",
      addresses: [],
      orderCount: 0,
      totalSpent: 0,
      createdAt: "server-timestamp",
    });

    expect(profile).toEqual({
      role: "customer",
      name: "Cliente Exemplo",
      email: "cliente@exemplo.com",
    });
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
