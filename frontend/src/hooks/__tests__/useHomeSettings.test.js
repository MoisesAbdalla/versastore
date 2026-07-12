import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Firestore pendente para sempre: força o hook a expor o estado INICIAL.
vi.mock("../../services/settingsService", async (importOriginal) => {
  const original = await importOriginal();

  return {
    ...original,
    getHomeSettings: vi.fn(() => new Promise(() => {})),
  };
});

import { useHomeSettings } from "../useHomeSettings";
import { getHomeSettings } from "../../services/settingsService";

describe("useHomeSettings", () => {
  it("estado inicial tem o shape completo (regressão: página branca por categoryPositions ausente)", () => {
    const { result } = renderHook(() => useHomeSettings());

    // Antes do Firestore responder, os componentes da Home já leem estes
    // campos — todos precisam existir.
    expect(result.current.heroImage).toBe(null);
    expect(result.current.heroPosition).toBe("center");
    expect(result.current.categoryImages).toEqual({});
    expect(result.current.categoryPositions).toEqual({});
  });

  it("compartilha uma única leitura entre os componentes da Home (cache de módulo)", async () => {
    renderHook(() => useHomeSettings());
    renderHook(() => useHomeSettings());

    await waitFor(() => expect(getHomeSettings).toHaveBeenCalledTimes(1));
  });
});
