import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const LS_KEY = "lot_cart_v1";

export function CartProvider({ children }) {
  // Drawer único
  const [isOpen, setIsOpen] = useState(false);

  // Items: { id, nombre, precio, img, club, categoria, qty }
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
    try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  // Helpers
  const findIndex = (id) => items.findIndex((it) => it.id === id);
  const isInCart = (id) => items.some((it) => it.id === id);

  const add = (product, qty = 1) => {
    if (!product?.id) return;
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...product, qty }];
    });
  };

  const remove = (id) => setItems((prev) => prev.filter((p) => p.id !== id));

  const setQty = (id, qty) => {
    setItems((prev) => {
      const idx = findIndex(id);
      if (idx < 0) return prev;
      const q = Math.max(1, qty|0);
      const next = [...prev];
      next[idx] = { ...next[idx], qty: q };
      return next;
    });
  };

  const inc = (id) => {
    setItems((prev) => {
      const idx = findIndex(id);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
  };

  const dec = (id) => {
    setItems((prev) => {
      const idx = findIndex(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const newQty = Math.max(1, next[idx].qty - 1);
      next[idx] = { ...next[idx], qty: newQty };
      return next;
    });
  };

  const clear = () => {
    setItems([]);
    try { localStorage.setItem(LS_KEY, JSON.stringify([])); } catch {}
  };

  const count = items.reduce((acc, it) => acc + it.qty, 0);
  const total = items.reduce((acc, it) => acc + (Number(it.precio) || 0) * it.qty, 0);

  // Drawer controls
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const value = useMemo(() => ({
    // drawer
    isOpen, openCart, closeCart,
    // data
    items, count, total,
    // ops
    add, remove, setQty, inc, dec, clear, isInCart
  }), [isOpen, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}