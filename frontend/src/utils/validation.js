// Validadores e máscaras pt-BR para os formulários da conta (feature 007).
// Mensagens retornadas em português, prontas para exibição campo a campo.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  if (!value || !value.trim()) {
    return "Informe seu e-mail.";
  }

  if (!EMAIL_RE.test(value.trim())) {
    return "E-mail inválido.";
  }

  return null;
}

export function validateName(value) {
  if (!value || !value.trim()) {
    return "Informe seu nome completo.";
  }

  if (value.trim().length < 3) {
    return "Nome muito curto.";
  }

  return null;
}

// Só dígitos; 10 (fixo) ou 11 (celular).
export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function validatePhone(value) {
  const digits = onlyDigits(value);

  if (!digits) {
    return "Informe seu telefone.";
  }

  if (digits.length < 10 || digits.length > 11) {
    return "Telefone inválido.";
  }

  return null;
}

export function maskPhone(value) {
  const d = onlyDigits(value).slice(0, 11);

  if (d.length <= 10) {
    return d
      .replace(/^(\d{0,2})/, "($1")
      .replace(/^(\(\d{2})(\d)/, "$1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/-(\d{4})\d+$/, "-$1");
  }

  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function validatePassword(value) {
  if (!value) {
    return "Crie uma senha.";
  }

  if (value.length < 8) {
    return "A senha deve ter ao menos 8 caracteres.";
  }

  return null;
}

// Força 0..4 (comprimento + variedade de classes) — orientativa.
export function passwordStrength(value) {
  if (!value) {
    return 0;
  }

  let score = 0;

  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value)) score++;

  return Math.min(score, 4);
}

export const PASSWORD_STRENGTH_LABELS = ["Muito fraca", "Fraca", "Média", "Forte", "Muito forte"];

export function validatePasswordConfirm(password, confirm) {
  if (!confirm) {
    return "Confirme a senha.";
  }

  if (password !== confirm) {
    return "As senhas não coincidem.";
  }

  return null;
}

export function validateTermsAccepted(accepted) {
  return accepted ? null : "É necessário aceitar os termos e a política de privacidade.";
}

export function validateCep(value) {
  const digits = onlyDigits(value);

  if (digits.length !== 8) {
    return "CEP inválido.";
  }

  return null;
}

export function maskCep(value) {
  const d = onlyDigits(value).slice(0, 8);

  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}
