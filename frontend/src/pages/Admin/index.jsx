import { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { uploadImage } from "../../services/cloudinaryService";
import ImageUploader from "./ImageUploader";
import { createProduct } from "../../services/productService";
import ROUTES from "../../constants/routes";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

function Admin() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [destaque, setDestaque] = useState(false);
  async function handleSave() {

    try{

        if(!image){

            alert("Selecione uma imagem.");

            return;

        }

        const imageUrl = await uploadImage(image);

        await createProduct({

            name: productName,

            category,

            price: Number(price),

            stock: Number(stock),

            description,

            image: imageUrl,

            destaque,

        });

        alert("Produto cadastrado com sucesso!");

        setProductName("");
        setCategory("");
        setPrice("");
        setStock("");
        setDescription("");
        setImage(null);
        setDestaque(false);

    }catch(error){

        console.error(error);

        alert("Erro ao cadastrar produto.");

    }

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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Typography
              variant="h4"
              fontWeight="bold"
            >
              Painel Administrativo
            </Typography>

            <Button
              component={Link}
              to={ROUTES.ADMIN_PRODUCTS}
              variant="outlined"
            >
              Ver produtos cadastrados
            </Button>
          </Box>

          <Typography
            variant="h6"
            mb={3}
          >
            Cadastrar Produto
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
          <ImageUploader
            image={image}
            setImage={setImage}
          />

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
            Salvar Produto
          </Button>
        </Paper>
      </Box>
    </MainLayout>
  );
}

export default Admin;