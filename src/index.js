import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { FavoritesProvider } from "./components/Favorites/FavoritesContext";
import { CartProvider } from "./components/Cart/CartContext";
import { ToastProvider } from "./components/ToastNotification/ToastNotification";
import { FiltersProvider } from "./context/FiltersContext"; 

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <FiltersProvider> 
          <FavoritesProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </FavoritesProvider>
        </FiltersProvider>
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>
);