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
const ProductListPage = lazy(() => import("../pages/Admin/Products/List"));
const ProductFormPage = lazy(() => import("../pages/Admin/Products/Form"));
const CategoriesPage = lazy(() => import("../pages/Admin/Categories"));
const OrderListPage = lazy(() => import("../pages/Admin/Orders/List"));
const OrderDetailPage = lazy(() => import("../pages/Admin/Orders/Detail"));
const CustomerListPage = lazy(() => import("../pages/Admin/Customers/List"));
const CustomerDetailPage = lazy(() => import("../pages/Admin/Customers/Detail"));

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
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="orders" element={<OrderListPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRoutes;
