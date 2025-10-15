// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";

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
import Checkout from "./pages/Checkout/Checkout"
import ForgotPassword from "./pages/Auth/ForgetPassword";
import ResetPassword from "./pages/Auth/ResetPassword";

// Drawers (SOLO componentes, sin Providers acá)
import FavoritesDrawer from "./components/Favorites/FavoritesDrawer";
import CartDrawer from "./components/Cart/CartDrawer";

// Estilos globales
import "./styles/main.css";
import "./styles/mobile.css";
import "./styles/user-widget.css";

export default function App() {
  return (
    <>
      {/* Montados una sola vez. Usan los Providers declarados en index.js */}
      <FavoritesDrawer />
      <CartDrawer />

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

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/sell" element={<Vender />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/help" element={<Help />} />
          <Route path='/checkout' element={<Checkout />} />
        </Route>
      </Routes>
    </>
  );
}