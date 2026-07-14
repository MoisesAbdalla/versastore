import { describe, it, expect, vi, beforeEach } from "vitest";

const getDocsMock = vi.fn();
const batchUpdateMock = vi.fn();
const batchCommitMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((db, name) => ({ collectionName: name })),
  doc: vi.fn((db, collectionName, id) => ({ collectionName, id })),
  getDocs: (...args) => getDocsMock(...args),
  writeBatch: vi.fn(() => ({ update: batchUpdateMock, commit: batchCommitMock })),
}));

vi.mock("../../firebase/firestore", () => ({ default: {} }));

import { backfillVariations } from "../backfillVariations";

function fakeDoc(id, data) {
  return { id, data: () => data };
}

function snapshotWith(docs) {
  return { docs };
}

beforeEach(() => {
  getDocsMock.mockReset();
  batchUpdateMock.mockReset();
  batchCommitMock.mockReset();
});

describe("backfillVariations (US3, FR-014/FR-015)", () => {
  it("produto consistente recebe attributes derivados e flag false", async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshotWith([
        fakeDoc("p1", {
          variations: [
            { id: "v1", attributes: { tamanho: "P", cor: "preta" }, stock: 2 },
            { id: "v2", attributes: { tamanho: "M", cor: "azul" }, stock: 1 },
          ],
        }),
      ])
    );

    const result = await backfillVariations();

    expect(result).toEqual({ updated: 1, flagged: 0, skipped: 0 });

    const [, changes] = batchUpdateMock.mock.calls[0];
    expect(changes.attributes).toEqual([
      { name: "tamanho", values: ["P", "M"] },
      { name: "cor", values: ["preta", "azul"] },
    ]);
    expect(changes.variationsInconsistent).toBe(false);
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it("produto inconsistente é SINALIZADO sem alterar variações nem attributes", async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshotWith([
        fakeDoc("p2", {
          variations: [
            { id: "v1", attributes: { tamanho: "P", cor: "preta" }, stock: 2 },
            { id: "v2", attributes: { cor: "azul" }, stock: 1 }, // sem tamanho
          ],
        }),
      ])
    );

    const result = await backfillVariations();

    expect(result).toEqual({ updated: 1, flagged: 1, skipped: 0 });

    const [, changes] = batchUpdateMock.mock.calls[0];
    expect(changes.variationsInconsistent).toBe(true);
    expect(changes.variationIssues.join(" ")).toMatch(/tamanho/);
    expect(changes.attributes).toBeUndefined(); // não adivinha
    expect(changes.variations).toBeUndefined(); // não altera variações
  });

  it("produto simples fica attributes: [] e consistente", async () => {
    getDocsMock.mockResolvedValueOnce(snapshotWith([fakeDoc("p3", { stock: 5, variations: [] })]));

    const result = await backfillVariations();

    expect(result).toEqual({ updated: 1, flagged: 0, skipped: 0 });

    const [, changes] = batchUpdateMock.mock.calls[0];
    expect(changes.attributes).toEqual([]);
    expect(changes.variationsInconsistent).toBe(false);
  });

  it("2ª execução é no-op (idempotente)", async () => {
    // Doc já no estado final da 1ª execução.
    getDocsMock.mockResolvedValueOnce(
      snapshotWith([
        fakeDoc("p1", {
          attributes: [{ name: "tamanho", values: ["P", "M"] }],
          variationsInconsistent: false,
          variationIssues: [],
          variations: [
            { id: "v1", attributes: { tamanho: "P" }, stock: 2 },
            { id: "v2", attributes: { tamanho: "M" }, stock: 1 },
          ],
        }),
      ])
    );

    const result = await backfillVariations();

    expect(result).toEqual({ updated: 0, flagged: 0, skipped: 1 });
    expect(batchUpdateMock).not.toHaveBeenCalled();
    expect(batchCommitMock).not.toHaveBeenCalled();
  });

  it("produto com combinação duplicada é sinalizado (mesma regra do save)", async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshotWith([
        fakeDoc("p4", {
          variations: [
            { id: "v1", attributes: { tamanho: "P" }, stock: 2 },
            { id: "v2", attributes: { tamanho: "P" }, stock: 3 },
          ],
        }),
      ])
    );

    const result = await backfillVariations();

    expect(result.flagged).toBe(1);
    const [, changes] = batchUpdateMock.mock.calls[0];
    expect(changes.variationsInconsistent).toBe(true);
    expect(changes.variationIssues.join(" ")).toMatch(/duplicada/);
  });
});
