export const PRODUCT_STATUS = {
  ATIVO: "ativo",
  INATIVO: "inativo",
  RASCUNHO: "rascunho",
};

export const PRODUCT_STATUS_LABELS = {
  [PRODUCT_STATUS.ATIVO]: "Ativo",
  [PRODUCT_STATUS.INATIVO]: "Inativo",
  [PRODUCT_STATUS.RASCUNHO]: "Rascunho",
};

export const IMAGE_UPLOAD = {
  ACCEPTED_FORMATS: ["image/jpeg", "image/png", "image/webp"],
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
};

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
