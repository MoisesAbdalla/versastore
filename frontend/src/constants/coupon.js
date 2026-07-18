// Tipos de cupom (feature 013). Valor fixo e percentual descontam o subtotal;
// frete grátis zera o frete do pedido (ver utils/coupon.js).
export const COUPON_TYPE = {
  FIXO: "fixo",
  PERCENTUAL: "percentual",
  FRETE_GRATIS: "frete_gratis",
};

export const COUPON_TYPE_LABELS = {
  [COUPON_TYPE.FIXO]: "Valor fixo",
  [COUPON_TYPE.PERCENTUAL]: "Percentual",
  [COUPON_TYPE.FRETE_GRATIS]: "Frete grátis",
};

export const COUPON_STATUS_LABELS = {
  ativo: "Ativo",
  inativo: "Inativo",
  expirado: "Expirado",
  esgotado: "Esgotado",
};
