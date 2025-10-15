// src/components/Favorites/FavoritesContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const FavoritesContext = createContext(null);
const LS_KEY = "lot_favorites_v1";

export function FavoritesProvider({ children }) {
  // Drawer (único en toda la app)
  const [isOpen, setIsOpen] = useState(false);

  // Items de favoritos
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persistencia
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // Helpers
  const isFavorite = (id) => items.some((it) => it.id === id);

  const add = (product) => {
    if (!product?.id) return;
    setItems((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev; // ya estaba
      return [...prev, product];
    });
  };

  const remove = (id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const toggle = (product) => {
    if (!product?.id) return;
    setItems((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  };

  // 🔧 El que te faltaba / no actualizaba:
  const clear = () => {
    setItems([]);                 // vacía estado
    try { localStorage.setItem(LS_KEY, JSON.stringify([])); } catch {} // y storage
  };

  // Drawer controls
  const openFavorites = () => setIsOpen(true);
  const closeFavorites = () => setIsOpen(false);

  const value = useMemo(
    () => ({
      // drawer
      isOpen,
      openFavorites,
      closeFavorites,
      // data
      items,
      count: items.length,
      // ops
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