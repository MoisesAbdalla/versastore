export async function uploadImage(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", "versa-store");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/stmjt15v/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Erro ao enviar imagem.");
  }

  const data = await response.json();

  return data.secure_url;
}