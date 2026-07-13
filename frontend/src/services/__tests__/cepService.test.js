import { describe, it, expect, vi, afterEach } from "vitest";
import { lookupCep } from "../cepService";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cepService.lookupCep (US5/SC-007)", () => {
  it("mapeia os campos do ViaCEP no sucesso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          cep: "01001-000",
          logradouro: "Praça da Sé",
          bairro: "Sé",
          localidade: "São Paulo",
          uf: "SP",
        }),
      })
    );

    const result = await lookupCep("01001000");

    expect(result).toEqual({
      cep: "01001-000",
      street: "Praça da Sé",
      neighborhood: "Sé",
      city: "São Paulo",
      state: "SP",
    });
  });

  it("retorna null para CEP com formato inválido (não chama a rede)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupCep("123")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retorna null quando o ViaCEP responde { erro: true }", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) })
    );

    expect(await lookupCep("00000000")).toBeNull();
  });

  it("retorna null em falha de rede/timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    expect(await lookupCep("01001000")).toBeNull();
  });

  it("retorna null quando a resposta HTTP não é ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

    expect(await lookupCep("01001000")).toBeNull();
  });
});
