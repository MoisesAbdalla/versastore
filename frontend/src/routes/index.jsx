import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Products from "../pages/Products";
import Product from "../pages/Product";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import CheckoutSuccess from "../pages/Checkout/Success";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import CompleteProfile from "../pages/CompleteProfile";
import Terms from "../pages/Legal/Terms";
import Privacy from "../pages/Legal/Privacy";
import NotFound from "../pages/NotFound";
import AccountLayout from "../layouts/AccountLayout";
import AccountPersonalData from "../pages/Account/PersonalData";
import AccountOrders from "../pages/Account/Orders";
import AccountOrderDetail from "../pages/Account/Orders/Detail";
import AccountAddresses from "../pages/Account/Addresses";
import AdminRoute from "./AdminRoute";
import PrivateRoute from "./PrivateRoute";
import CompleteProfileGuard from "./CompleteProfileGuard";

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
const ReportsPage = lazy(() => import("../pages/Admin/Reports"));
const AppearancePage = lazy(() => import("../pages/Admin/Appearance"));
const ShippingPage = lazy(() => import("../pages/Admin/Shipping"));
const CouponsPage = lazy(() => import("../pages/Admin/Coupons"));

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>

          <Route path="/" element={<Home />} />

          <Route path="/products" element={<Products />} />

          <Route path="/product/:id" element={<Product />} />

          <Route path="/cart" element={<Cart />} />

          <Route
            path="/checkout"
            element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            }
          />

          <Route
            path="/checkout/sucesso"
            element={
              <PrivateRoute>
                <CheckoutSuccess />
              </PrivateRoute>
            }
          />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route path="/recuperar-senha" element={<ForgotPassword />} />

          <Route
            path="/completar-cadastro"
            element={
              <CompleteProfileGuard>
                <CompleteProfile />
              </CompleteProfileGuard>
            }
          />

          <Route
            path="/conta"
            element={
              <PrivateRoute>
                <AccountLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<AccountPersonalData />} />
            <Route path="pedidos" element={<AccountOrders />} />
            <Route path="pedidos/:id" element={<AccountOrderDetail />} />
            <Route path="enderecos" element={<AccountAddresses />} />
          </Route>

          <Route path="/termos" element={<Terms />} />

          <Route path="/privacidade" element={<Privacy />} />

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
            <Route path="reports" element={<ReportsPage />} />
            <Route path="frete" element={<ShippingPage />} />
            <Route path="cupons" element={<CouponsPage />} />
            <Route path="appearance" element={<AppearancePage />} />
          </Route>

          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRoutes;
