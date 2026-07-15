import { describe, it, expect } from "vitest";

import {
  validateEmail,
  validateName,
  validatePhone,
  maskPhone,
  validatePassword,
  passwordStrength,
  validatePasswordConfirm,
  validateTermsAccepted,
  validateCep,
  maskCep,
  validateCpf,
  maskCpf,
} from "../validation";

describe("validateEmail", () => {
  it("aceita e-mail válido e rejeita inválido/vazio", () => {
    expect(validateEmail("a@b.com")).toBe(null);
    expect(validateEmail("semarroba")).toBe("E-mail inválido.");
    expect(validateEmail("")).toBe("Informe seu e-mail.");
  });
});

describe("validateName", () => {
  it("exige nome não vazio e mínimo", () => {
    expect(validateName("Maria Silva")).toBe(null);
    expect(validateName("")).toBe("Informe seu nome completo.");
    expect(validateName("Ma")).toBe("Nome muito curto.");
  });
});

describe("validatePhone / maskPhone", () => {
  it("valida 10–11 dígitos", () => {
    expect(validatePhone("(11) 91234-5678")).toBe(null);
    expect(validatePhone("1132145678")).toBe(null);
    expect(validatePhone("123")).toBe("Telefone inválido.");
    expect(validatePhone("")).toBe("Informe seu telefone.");
  });

  it("aplica a máscara de celular e fixo", () => {
    expect(maskPhone("11912345678")).toBe("(11) 91234-5678");
    expect(maskPhone("1132145678")).toBe("(11) 3214-5678");
  });
});

describe("validatePassword / passwordStrength / confirm", () => {
  it("exige mínimo de 8 caracteres", () => {
    expect(validatePassword("12345678")).toBe(null);
    expect(validatePassword("123")).toBe("A senha deve ter ao menos 8 caracteres.");
    expect(validatePassword("")).toBe("Crie uma senha.");
  });

  it("mede a força de 0 a 4", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abcdefgh")).toBeGreaterThanOrEqual(1);
    expect(passwordStrength("Abcdef12!x")).toBe(4);
  });

  it("confirma que as senhas coincidem", () => {
    expect(validatePasswordConfirm("abc12345", "abc12345")).toBe(null);
    expect(validatePasswordConfirm("abc12345", "outra")).toBe("As senhas não coincidem.");
    expect(validatePasswordConfirm("abc12345", "")).toBe("Confirme a senha.");
  });
});

describe("validateTermsAccepted", () => {
  it("exige aceite", () => {
    expect(validateTermsAccepted(true)).toBe(null);
    expect(validateTermsAccepted(false)).toContain("aceitar os termos");
  });
});

describe("validateCep / maskCep", () => {
  it("valida 8 dígitos e mascara", () => {
    expect(validateCep("01001000")).toBe(null);
    expect(validateCep("123")).toBe("CEP inválido.");
    expect(maskCep("01001000")).toBe("01001-000");
  });
});

describe("validateCpf / maskCpf", () => {
  it("aceita CPFs válidos (com e sem máscara)", () => {
    expect(validateCpf("529.982.247-25")).toBe(null);
    expect(validateCpf("52998224725")).toBe(null);
    expect(validateCpf("111.444.777-35")).toBe(null);
  });

  it("rejeita DV inválido", () => {
    expect(validateCpf("529.982.247-24")).toBe("CPF inválido.");
    expect(validateCpf("11144477736")).toBe("CPF inválido.");
  });

  it("rejeita sequência repetida e tamanho errado", () => {
    expect(validateCpf("111.111.111-11")).toBe("CPF inválido.");
    expect(validateCpf("00000000000")).toBe("CPF inválido.");
    expect(validateCpf("123")).toBe("CPF inválido.");
    expect(validateCpf("")).toBe("CPF inválido.");
  });

  it("máscara progressiva", () => {
    expect(maskCpf("529")).toBe("529");
    expect(maskCpf("529982")).toBe("529.982");
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
    expect(maskCpf("529982247259999")).toBe("529.982.247-25"); // trava em 11 dígitos
  });
});
