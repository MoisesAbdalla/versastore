// Versão vigente dos documentos legais (termos de uso, política de privacidade
// e política de trocas — feature 007/017). Gravada no perfil do cliente no
// momento do aceite (users.termsVersion). Quando os documentos mudam, esta
// constante sobe e quem aceitou versão anterior é re-solicitado (TermsGate).
//
// ATUALIZAR sempre que o conteúdo de /termos, /privacidade ou /trocas mudar.
// 2026-07-19 (feature 017/M8): textos reais substituem os placeholders do M3.
export const TERMS_VERSION = "2026-07-19";

// Precisa re-aceitar? Perfil com versão antiga OU sem registro → true.
// Sem perfil (deslogado/carregando) → false — a navegação pública nunca trava.
export function needsTermsReaccept(profile) {
  return Boolean(profile) && profile.termsVersion !== TERMS_VERSION;
}
