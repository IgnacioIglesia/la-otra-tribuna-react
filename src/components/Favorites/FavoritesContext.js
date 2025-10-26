import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "../ToastNotification/ToastNotification"; // ✅ Importar useToast

const FavoritesContext = createContext(null);
const LS_KEY = "lot_favorites_v1";

export function FavoritesProvider({ children }) {
  const { showToast } = useToast(); // ✅ Usar toast
  const [isOpen, setIsOpen] = useState(false);

  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const isFavorite = (id) => items.some((it) => it.id === id);

  const add = (product) => {
    if (!product?.id) return;
    setItems((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      
      // ✅ Toast en lugar de notificación
      showToast(`"${product.nombre}" fue agregado a favoritos`, "success");
      
      // Mantener la notificación del dropdown también
      window.dispatchEvent(new CustomEvent("new-notification", {
        detail: {
          tipo: "favorito",
          titulo: "Producto agregado a favoritos",
          mensaje: `"${product.nombre}"`,
          id_publicacion: product.id,
        }
      }));
      
      return [...prev, product];
    });
  };

  const remove = (id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const toggle = (product) => {
    if (!product?.id) return;
    
    const wasInFavorites = items.some((p) => p.id === product.id);
    
    setItems((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
    
    if (!wasInFavorites) {
      // ✅ Toast visual
      showToast(`"${product.nombre}" fue agregado a favoritos`, "success");
      
      // Notificación del dropdown
      window.dispatchEvent(new CustomEvent("new-notification", {
        detail: {
          tipo: "favorito",
          titulo: "Producto agregado a favoritos",
          mensaje: `"${product.nombre}"`,
          id_publicacion: product.id,
        }
      }));
    }
  };

  const clear = () => {
    setItems([]);
    try { localStorage.setItem(LS_KEY, JSON.stringify([])); } catch {}
  };

  const openFavorites = () => setIsOpen(true);
  const closeFavorites = () => setIsOpen(false);

  const value = useMemo(
    () => ({
      isOpen,
      openFavorites,
      closeFavorites,
      items,
      count: items.length,
      add,
      remove,
      toggle,
      isFavorite,
      clear,
    }),
    [isOpen, items]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
}