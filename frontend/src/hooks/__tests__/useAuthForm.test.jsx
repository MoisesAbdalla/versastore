import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useAuthForm } from "../useAuthForm";

const schema = {
  email: (v) => (v ? null : "Informe o e-mail."),
  password: (v) => (v && v.length >= 8 ? null : "Senha curta."),
};

describe("useAuthForm", () => {
  it("valida por campo e marca todos como tocados no validateAll", () => {
    const { result } = renderHook(() => useAuthForm({ email: "", password: "" }, schema));

    let ok;
    act(() => {
      ok = result.current.validateAll();
    });

    expect(ok).toBe(false);
    expect(result.current.errors.email).toBe("Informe o e-mail.");
    expect(result.current.errors.password).toBe("Senha curta.");
    expect(result.current.touched.email).toBe(true);
  });

  it("passa quando tudo é válido", () => {
    const { result } = renderHook(() =>
      useAuthForm({ email: "a@b.com", password: "12345678" }, schema)
    );

    let ok;
    act(() => {
      ok = result.current.validateAll();
    });

    expect(ok).toBe(true);
    expect(result.current.errors.email).toBe(null);
  });

  it("revalida em tempo real após o campo ser tocado", () => {
    const { result } = renderHook(() => useAuthForm({ email: "", password: "" }, schema));

    act(() => result.current.blurField("email"));
    expect(result.current.errors.email).toBe("Informe o e-mail.");

    act(() => result.current.setField("email", "a@b.com"));
    expect(result.current.errors.email).toBe(null);
  });
});
