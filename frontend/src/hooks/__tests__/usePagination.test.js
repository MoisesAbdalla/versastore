import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { usePagination } from "../usePagination";

function makeFetchPage(pages) {
  // Simula páginas encadeadas por cursor: cursor null → página 1,
  // cursor "c1" → página 2, etc.
  return vi.fn(async (cursor) => {
    const index = cursor === null ? 0 : Number(cursor.slice(1));

    return pages[index];
  });
}

const pages = [
  { items: ["a", "b"], nextCursor: "c1", hasMore: true },
  { items: ["c", "d"], nextCursor: "c2", hasMore: true },
  { items: ["e"], nextCursor: null, hasMore: false },
];

describe("usePagination", () => {
  it("carrega a primeira página com cursor nulo", async () => {
    const fetchPage = makeFetchPage(pages);
    const { result } = renderHook(() => usePagination(fetchPage));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPage).toHaveBeenCalledWith(null);
    expect(result.current.items).toEqual(["a", "b"]);
    expect(result.current.page).toBe(1);
    expect(result.current.hasMore).toBe(true);
  });

  it("avança com startAfter (cursor da página anterior) e volta pela pilha", async () => {
    const fetchPage = makeFetchPage(pages);
    const { result } = renderHook(() => usePagination(fetchPage));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.next());
    await waitFor(() => expect(result.current.page).toBe(2));

    expect(fetchPage).toHaveBeenLastCalledWith("c1");
    expect(result.current.items).toEqual(["c", "d"]);

    act(() => result.current.prev());
    await waitFor(() => expect(result.current.page).toBe(1));

    expect(result.current.items).toEqual(["a", "b"]);
  });

  it("não avança além da última página", async () => {
    const fetchPage = makeFetchPage(pages);
    const { result } = renderHook(() => usePagination(fetchPage));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.next());
    await waitFor(() => expect(result.current.page).toBe(2));

    act(() => result.current.next());
    await waitFor(() => expect(result.current.page).toBe(3));

    expect(result.current.hasMore).toBe(false);

    act(() => result.current.next());

    expect(result.current.page).toBe(3);
  });

  it("expõe erro sem quebrar (falha de conexão exibe estado apropriado)", async () => {
    const fetchPage = vi.fn(async () => {
      throw new Error("offline");
    });

    const { result } = renderHook(() => usePagination(fetchPage));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.items).toEqual([]);
  });
});
