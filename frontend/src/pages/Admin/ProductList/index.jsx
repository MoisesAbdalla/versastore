import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../../layouts/MainLayout";
import { getProducts } from "../../../services/productService";
import ROUTES from "../../../constants/routes";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from "@mui/material";

function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((error) => {
        console.error(error);
        setProducts([]);
      })
      .finally(() => setLoaded(true));
  }, []);

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
            Produtos Cadastrados
          </Typography>

          {loaded && products.length === 0 ? (
            <Typography>Nenhum produto cadastrado ainda.</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Destaque</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`${ROUTES.ADMIN_PRODUCTS}/${product.id}`)}
                  >
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {product.destaque ? (
                        <Chip label="Destaque" color="primary" size="small" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    </MainLayout>
  );
}

export default ProductList;
