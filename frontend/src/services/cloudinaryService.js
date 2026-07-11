import { IMAGE_UPLOAD } from "../constants/product";

const UPLOAD_URL = "https://api.cloudinary.com/v1_1/stmjt15v/image/upload";
const UPLOAD_PRESET = "versa-store";

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
