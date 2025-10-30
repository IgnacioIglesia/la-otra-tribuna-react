// src/components/Cart/CartContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "../ToastNotification/ToastNotification";
import { supabase } from "../../lib/supabaseClient";

const CartContext = createContext(null);
const LS_KEY = "lot_cart_v1";

export function CartProvider({ children }) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // ✅ Estado para moneda seleccionada
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    try {
      return localStorage.getItem('selected_currency') || 'USD';
    } catch {
      return 'USD';
    }
  });

  const [exchangeRate, setExchangeRate] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  // Guardar moneda seleccionada
  useEffect(() => {
    try {
      localStorage.setItem('selected_currency', selectedCurrency);
    } catch {}
  }, [selectedCurrency]);

  const findIndex = (id) => items.findIndex((it) => it.id === id);
  const isInCart = (id) => items.some((it) => it.id === id);
  
  const getQty = (id) => {
    const item = items.find((it) => it.id === id);
    return item ? item.qty : 0;
  };

  // ✅ Función para cambiar moneda
  const changeCurrency = (currency, rates) => {
    setSelectedCurrency(currency);
    setExchangeRate(rates);
  };

  // ✅ Función para convertir precio según moneda seleccionada
  const convertPrice = (price, itemCurrency) => {
    if (!exchangeRate) return price;
    
    // Si la moneda del item es la misma que la seleccionada, no convertir
    if (itemCurrency === selectedCurrency) return price;
    
    // Convertir según sea necesario
    if (selectedCurrency === 'USD' && itemCurrency === 'UYU') {
      return price * exchangeRate.UYU_to_USD;
    }
    if (selectedCurrency === 'UYU' && itemCurrency === 'USD') {
      return price * exchangeRate.USD_to_UYU;
    }
    
    return price;
  };

  // ✅ FUNCIÓN ADD CON VALIDACIÓN DE STOCK
  const add = async (product, qty = 1) => {
    if (!product?.id) return { success: false, mensaje: "Producto inválido" };
    
    try {
      const { data: productoActual, error } = await supabase
        .from('publicacion')
        .select('stock')
        .eq('id_publicacion', product.id)
        .single();

      if (error) {
        console.error('Error al obtener stock:', error);
        showToast("Error al verificar el stock", "error");
        return { success: false, mensaje: "Error al verificar el stock" };
      }

      const itemEnCarrito = items.find((it) => it.id === product.id);
      const cantidadEnCarrito = itemEnCarrito ? itemEnCarrito.qty : 0;

      if (cantidadEnCarrito + qty > productoActual.stock) {
        const disponible = productoActual.stock - cantidadEnCarrito;
        
        if (disponible <= 0) {
          showToast(`Ya tienes el máximo disponible (${cantidadEnCarrito}) en el carrito`, "error");
          return { 
            success: false, 
            mensaje: `Ya tienes el máximo disponible en el carrito` 
          };
        } else {
          showToast(`Solo puedes agregar ${disponible} unidad(es) más`, "error");
          return { 
            success: false, 
            mensaje: `Solo puedes agregar ${disponible} unidad(es) más` 
          };
        }
      }

      const wasInCart = items.some((p) => p.id === product.id);
      
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === product.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + qty };
          return next;
        }
        return [...prev, { ...product, qty }];
      });
      
      if (wasInCart) {
        showToast(`Se agregó otra unidad de "${product.nombre}"`, "success");
      } else {
        showToast(`"${product.nombre}" fue agregado al carrito`, "success");
      }
      
      if (!wasInCart) {
        window.dispatchEvent(new CustomEvent("new-notification", {
          detail: {
            tipo: "carrito",
            titulo: "Producto agregado al carrito",
            mensaje: `"${product.nombre}"`,
            id_publicacion: product.id,
          }
        }));
      }

      return { success: true, mensaje: "Producto agregado" };

    } catch (error) {
      console.error('Error en add:', error);
      showToast("Error inesperado al agregar al carrito", "error");
      return { success: false, mensaje: "Error inesperado" };
    }
  };

  const remove = (id) => setItems((prev) => prev.filter((p) => p.id !== id));

  const setQty = async (id, qty) => {
    const newQty = Math.max(1, qty|0);
    
    try {
      const { data: producto, error } = await supabase
        .from('publicacion')
        .select('stock')
        .eq('id_publicacion', id)
        .single();

      if (error) {
        showToast("Error al verificar stock", "error");
        return { success: false };
      }

      if (newQty > producto.stock) {
        showToast(`Stock insuficiente. Solo hay ${producto.stock} disponibles`, "error");
        return { success: false };
      }

      setItems((prev) => {
        const idx = findIndex(id);
        if (idx < 0) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], qty: newQty };
        return next;
      });

      return { success: true };
    } catch (error) {
      console.error('Error en setQty:', error);
      return { success: false };
    }
  };

  const inc = async (id) => {
    try {
      const item = items.find((it) => it.id === id);
      if (!item) return { success: false };

      const { data: producto, error } = await supabase
        .from('publicacion')
        .select('stock')
        .eq('id_publicacion', id)
        .single();

      if (error) {
        showToast("Error al verificar stock", "error");
        return { success: false };
      }

      if (item.qty + 1 > producto.stock) {
        showToast(`Stock insuficiente. Solo hay ${producto.stock} disponibles`, "error");
        return { success: false };
      }

      setItems((prev) => {
        const idx = findIndex(id);
        if (idx < 0) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      });

      return { success: true };
    } catch (error) {
      console.error('Error en inc:', error);
      return { success: false };
    }
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

  // ✅ Total convertido a la moneda seleccionada
  const getTotalInSelectedCurrency = () => {
    return items.reduce((total, item) => {
      const precio = Number(item.precio) || 0;
      const convertedPrice = convertPrice(precio, item.moneda);
      return total + (convertedPrice * item.qty);
    }, 0);
  };

  const count = items.reduce((acc, it) => acc + it.qty, 0);
  const total = getTotalInSelectedCurrency();

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const value = useMemo(() => ({
    isOpen, openCart, closeCart,
    items, count, total,
    selectedCurrency,
    changeCurrency,
    convertPrice,
    add, remove, setQty, inc, dec, clear, isInCart, getQty
  }), [isOpen, items, selectedCurrency, exchangeRate]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ✅ EXPORTAR useCart
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}