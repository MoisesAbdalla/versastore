import { describe, it, expect, vi } from "vitest";

const updateDocMock = vi.fn();
const docMock = vi.fn((db, collectionName, id) => ({ db, collectionName, id }));

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: (...args) => docMock(...args),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  updateDoc: (...args) => updateDocMock(...args),
  where: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock("../../firebase/firestore", () => ({
  default: {},
}));

import { updateProduct } from "../productService";

describe("updateProduct", () => {
  it("alters stock (and any other provided fields) without touching fields that were not passed", async () => {
    updateDocMock.mockResolvedValueOnce(undefined);

    await updateProduct("product-123", { stock: 42, destaque: true });

    expect(updateDocMock).toHaveBeenCalledTimes(1);

    const [docRef, changes] = updateDocMock.mock.calls[0];

    expect(docRef).toEqual({ db: {}, collectionName: "products", id: "product-123" });
    expect(changes).toEqual({ stock: 42, destaque: true });
    expect(changes).not.toHaveProperty("name");
    expect(changes).not.toHaveProperty("image");
  });

  it("propagates Firestore errors so the caller (edit screen) can handle them", async () => {
    updateDocMock.mockRejectedValueOnce(new Error("network error"));

    await expect(updateProduct("product-123", { stock: 10 })).rejects.toThrow("network error");
  });
});
