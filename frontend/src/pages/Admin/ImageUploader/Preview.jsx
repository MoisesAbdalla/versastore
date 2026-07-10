import styles from "./styles.module.css";

function Preview({ preview, image }) {

    const size = (image.size / 1024 / 1024).toFixed(2);

    return (

        <div className={styles.preview}>
            {preview && (
                <img
                    src={preview}
                    alt="Preview"
                />
                )}
            <h3>{image.name}</h3>

            <p>{size} MB</p>

        </div>

    );

}

export default Preview;