import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Products from "../pages/Products";
import Product from "../pages/Product";
import Login from "../pages/Login";
import Register from "../pages/Register";
import NotFound from "../pages/NotFound";
import Admin from "../pages/Admin";
import ProductList from "../pages/Admin/ProductList";
import ProductEdit from "../pages/Admin/ProductEdit";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/products" element={<Products />} />

        <Route path="/product/:id" element={<Product />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="*" element={<NotFound />} />

        <Route path="/admin" element={<Admin />} />

        <Route path="/admin/products" element={<ProductList />} />

        <Route path="/admin/products/:id" element={<ProductEdit />} />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;