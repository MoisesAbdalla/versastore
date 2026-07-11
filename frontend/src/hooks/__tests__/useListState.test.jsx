import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { useListState } from "../useListState";

const defaults = { search: "", status: "todos", after: null, page: null };

function wrapperWithUrl(initialEntry) {
  return function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe("useListState", () => {
  it("usa os defaults quando a URL está limpa", () => {
    const { result } = renderHook(() => useListState(defaults), {
      wrapper: wrapperWithUrl("/admin/products"),
    });

    expect(result.current.state.search).toBe("");
    expect(result.current.state.status).toBe("todos");
  });

  it("restaura o estado a partir dos query params da URL (voltar do detalhe, FR-085)", () => {
    const { result } = renderHook(() => useListState(defaults), {
      wrapper: wrapperWithUrl("/admin/products?search=tenis&status=ativo&after=abc123"),
    });

    expect(result.current.state.search).toBe("tenis");
    expect(result.current.state.status).toBe("ativo");
    expect(result.current.state.after).toBe("abc123");
  });

  it("grava mudanças na URL e omite valores iguais ao default", () => {
    const { result } = renderHook(() => useListState(defaults), {
      wrapper: wrapperWithUrl("/admin/products"),
    });

    act(() => {
      result.current.setState({ search: "camiseta", status: "todos" });
    });

    expect(result.current.state.search).toBe("camiseta");
    expect(result.current.state.status).toBe("todos");
  });

  it("setFilters zera cursor e página ao mudar qualquer filtro", () => {
    const { result } = renderHook(() => useListState(defaults), {
      wrapper: wrapperWithUrl("/admin/products?after=abc123&page=3"),
    });

    act(() => {
      result.current.setFilters({ status: "ativo" });
    });

    expect(result.current.state.status).toBe("ativo");
    expect(result.current.state.after).toBe(null);
    expect(result.current.state.page).toBe(null);
  });
});
