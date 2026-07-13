import { IMAGE_UPLOAD } from "../constants/product";

const UPLOAD_URL = "https://api.cloudinary.com/v1_1/stmjt15v/image/upload";
const UPLOAD_PRESET = "versa-store";

// Larguras por contexto da vitrine (feature 005 / D5). Servir a imagem no
// tamanho de exibição evita baixar full-res no card/miniatura.
export const IMAGE_WIDTHS = {
  card: 400,
  thumb: 120,
  main: 800,
  zoom: 1600,
};

// Insere transformações de entrega (f_auto,q_auto,w_) logo após o segmento
// "/upload/" de uma URL do Cloudinary. URLs que não sigam esse padrão (ou
// vazias) retornam inalteradas — fallback seguro para imagens legadas.
export function cloudinaryUrl(url, { w, extra = "" } = {}) {
  if (!url || typeof url !== "string" || !url.includes("/upload/")) {
    return url || "";
  }

  const transforms = ["f_auto", "q_auto"];

  if (w) {
    transforms.push(`w_${w}`);
  }

  if (extra) {
    transforms.push(extra);
  }

  return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function validateImageFile(file) {
  if (!IMAGE_UPLOAD.ACCEPTED_FORMATS.includes(file.type)) {
    const error = new Error("Formato inválido. Use JPG, PNG ou WebP.");
    error.code = "arquivo-invalido";
    throw error;
  }

  if (file.size > IMAGE_UPLOAD.MAX_SIZE_BYTES) {
    const error = new Error("Imagem acima de 5 MB. Reduza o tamanho e tente novamente.");
    error.code = "arquivo-invalido";
    throw error;
  }
}

async function doUpload(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Erro ao enviar imagem.");
  }

  const data = await response.json();

  return data.secure_url;
}

export async function uploadImage(file) {
  return doUpload(file);
}

// Upload com retry e backoff exponencial (research R-13): rede móvel instável
// não pode travar o formulário (FR-025). Valida formato/tamanho ANTES de gastar
// tentativas de rede.
export async function uploadImageWithRetry(file, { attempts = 3, onAttempt } = {}) {
  validateImageFile(file);

  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (onAttempt) {
      onAttempt(attempt);
    }

    try {
      return await doUpload(file);
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await wait(1000 * 2 ** (attempt - 1));
      }
    }
  }

  const error = new Error("Falha ao enviar a imagem após 3 tentativas. Verifique sua conexão e tente novamente.");
  error.code = "upload-falhou";
  error.cause = lastError;
  throw error;
}
