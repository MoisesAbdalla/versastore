const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
];

export function validateImage(file){

    if(!file){

        return "Nenhuma imagem selecionada.";

    }

    if(!ALLOWED_TYPES.includes(file.type)){

        return "Formato não permitido.";

    }

    if(file.size > MAX_SIZE){

        return "A imagem deve ter no máximo 5 MB.";

    }

    return null;

}