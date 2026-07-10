import { useEffect, useState } from "react";

import styles from "./styles.module.css";

import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

function ImageUploader({ image, setImage }) {

    const [preview, setPreview] = useState("");

    useEffect(() => {

        if (!image) {
            setPreview("");
            return;
        }

        const objectUrl = URL.createObjectURL(image);

        setPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);

    }, [image]);

    return (

        <div className={styles.container}>

            {!image ? (

                <label className={styles.uploadArea}>

                    <CloudUploadOutlinedIcon
                        sx={{ fontSize: 60 }}
                    />

                    <h3>Clique para selecionar uma imagem</h3>

                    <p>PNG • JPG • JPEG • WEBP</p>

                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                            setImage(e.target.files[0])
                        }
                    />

                </label>

            ) : (

                <div className={styles.preview}>

                    <img
                        src={preview}
                        alt="Preview"
                    />

                    <h4>{image.name}</h4>

                    <div className={styles.buttons}>

                        <label>

                            Trocar imagem

                            <input
                                hidden
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    setImage(e.target.files[0])
                                }
                            />

                        </label>

                        <button
                            onClick={() => setImage(null)}
                        >
                            <DeleteOutlineOutlinedIcon />

                            Remover
                        </button>

                    </div>

                </div>

            )}

        </div>

    );

}

export default ImageUploader;