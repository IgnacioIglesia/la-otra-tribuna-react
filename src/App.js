// src/App.js
import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

// Páginas
import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Terms from "./pages/Terms/Terms";
import Privacy from "./pages/Privacy/Privacy";
import Help from "./pages/Help/Help";
import Authenticity from "./pages/Authenticity/Authenticity";
import HowItWorks from "./pages/HowItWorks/HowItWorks";
import Favorites from "./pages/Favorites/Favorites";
import TrackOrder from "./pages/Track/TrackOrder";
import Vender from "./pages/Sell/Vender";
import Offers from "./pages/Offers/Offers";
import Perfil from "./pages/Perfil/Perfil";
import ProtectedRoute from "./routes/ProtectedRoute";
import MyListings from "./pages/MyListings/MyListings";
import Publication from "./pages/Publication/Publication";
import Checkout from "./pages/Checkout/Checkout";
import ForgotPassword from "./pages/Auth/ForgetPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import SearchPage from "./components/SearchBar/SearchPage";
import SellerPublications from "./pages/SellerPublications/SellerPublications";
import AdminPanel from "./pages/Admin/AdminPanel";
import AdminRoute from "./pages/Admin/AdminRoute";
import MisVentas from "./pages/MySeller/mis-ventas";
import MisPedidos from "./pages/MyOrders/mis-pedidos";

// 👇 Páginas del modo impostor
import Impostor from "./pages/Impostor/Impostor";
import ImpostorGame from "./pages/Impostor/ImpostorGame";

// Drawers
import FavoritesDrawer from "./components/Favorites/FavoritesDrawer";
import CartDrawer from "./components/Cart/CartDrawer";

// Estilos globales
import "./styles/main.css";
import "./styles/mobile.css";
import "./styles/user-widget.css";

/** Gestiona el scroll entre rutas */
function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const { hash, pathname, search } = location;

    if (hash) {
      requestAnimationFrame(() => {
        const id = decodeURIComponent(hash.slice(1));
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
      return;
    }

    void pathname;
    void search;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}

export default function App() {
  return (
    <>
      <FavoritesDrawer />
      <CartDrawer />

      {/* Control de scroll global */}
      <ScrollManager />

      {/* wrapper que recibe el padding-top dinámico del header fijo */}
      <main className="page-root">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/authenticity" element={<Authenticity />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/publication/:id" element={<Publication />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/seller/:id" element={<SellerPublications />} />
          <Route path="/my-sales" element={<MisVentas />} />
          <Route path="/my-orders" element={<MisPedidos />} />
          <Route path="/favorites" element={<Favorites />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/sell" element={<Vender />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/help" element={<Help />} />
            <Route path="/checkout" element={<Checkout />} />

            {/* 👇 CORREGIDO: Rutas del juego impostor */}
            <Route path="/impostor" element={<Impostor />} />
            <Route path="/impostor/sala/:roomCode" element={<ImpostorGame />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Routes>
      </main>
    </>
  );
}