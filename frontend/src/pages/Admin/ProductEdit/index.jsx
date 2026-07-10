import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../../../layouts/MainLayout";
import { uploadImage } from "../../../services/cloudinaryService";
import { getProduct, updateProduct } from "../../../services/productService";
import ROUTES from "../../../constants/routes";
import ImageUploader from "../ImageUploader";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [destaque, setDestaque] = useState(false);

  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [newImageFile, setNewImageFile] = useState(null);

  useEffect(() => {
    getProduct(id)
      .then((product) => {
        if (!product) {
          setNotFound(true);
          return;
        }

        setProductName(product.name ?? "");
        setCategory(product.category ?? "");
        setPrice(String(product.price ?? ""));
        setStock(String(product.stock ?? ""));
        setDescription(product.description ?? "");
        setDestaque(Boolean(product.destaque));
        setExistingImageUrl(product.image ?? "");
      })
      .catch((error) => {
        console.error(error);
        setNotFound(true);
      })
      .finally(() => setLoaded(true));
  }, [id]);

  async function handleSave() {
    try {
      const changes = {
        name: productName,
        category,
        price: Number(price),
        stock: Number(stock),
        description,
        destaque,
      };

      if (newImageFile) {
        changes.image = await uploadImage(newImageFile);
      }

      await updateProduct(id, changes);

      alert("Produto atualizado com sucesso!");
      navigate(ROUTES.ADMIN_PRODUCTS);
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar produto.");
    }
  }

  if (!loaded) {
    return (
      <MainLayout>
        <Box sx={{ maxWidth: 900, margin: "40px auto" }}>
          <Typography>Carregando...</Typography>
        </Box>
      </MainLayout>
    );
  }

  if (notFound) {
    return (
      <MainLayout>
        <Box sx={{ maxWidth: 900, margin: "40px auto" }}>
          <Typography>Produto não encontrado.</Typography>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box
        sx={{
          maxWidth: 900,
          margin: "40px auto",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            borderRadius: 3,
          }}
        >
          <Typography
            variant="h4"
            fontWeight="bold"
            mb={4}
          >
            Editar Produto
          </Typography>

          <TextField
            fullWidth
            label="Nome do Produto"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Preço"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Estoque"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            margin="normal"
          />

          <TextField
            fullWidth
            multiline
            rows={5}
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
          />

          {newImageFile ? (
            <ImageUploader
              image={newImageFile}
              setImage={setNewImageFile}
            />
          ) : (
            <Box sx={{ my: 2 }}>
              {existingImageUrl && (
                <Box
                  component="img"
                  src={existingImageUrl}
                  alt={productName}
                  sx={{
                    width: 160,
                    height: 160,
                    objectFit: "cover",
                    display: "block",
                    mb: 1,
                  }}
                />
              )}

              <Button
                variant="outlined"
                component="label"
              >
                Trocar imagem
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setNewImageFile(e.target.files[0])}
                />
              </Button>
            </Box>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={destaque}
                onChange={(e) => setDestaque(e.target.checked)}
              />
            }
            label="Marcar como produto em destaque"
          />

          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ display: "block", mt: 2 }}
          >
            Salvar Alterações
          </Button>
        </Paper>
      </Box>
    </MainLayout>
  );
}

export default ProductEdit;
