import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Products from "../pages/Products";
import Product from "../pages/Product";
import Login from "../pages/Login";
import Register from "../pages/Register";
import NotFound from "../pages/NotFound";
import AdminRoute from "./AdminRoute";

// Rotas do painel com code splitting (constituição, Princípio IV): o bundle
// inicial da loja não carrega nada do admin.
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const Dashboard = lazy(() => import("../pages/Admin/Dashboard"));
const AccessDenied = lazy(() => import("../pages/Admin/AccessDenied"));

// Telas legadas da feature 002 — absorvidas pelas novas telas de produtos na US2 (T029).
const LegacyProductForm = lazy(() => import("../pages/Admin"));
const LegacyProductList = lazy(() => import("../pages/Admin/ProductList"));
const LegacyProductEdit = lazy(() => import("../pages/Admin/ProductEdit"));

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>

          <Route path="/" element={<Home />} />

          <Route path="/products" element={<Products />} />

          <Route path="/product/:id" element={<Product />} />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route path="/acesso-negado" element={<AccessDenied />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Dashboard />} />
          </Route>

          <Route
            path="/admin/products"
            element={
              <AdminRoute>
                <LegacyProductList />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/products/new"
            element={
              <AdminRoute>
                <LegacyProductForm />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/products/:id"
            element={
              <AdminRoute>
                <LegacyProductEdit />
              </AdminRoute>
            }
          />

          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRoutes;
