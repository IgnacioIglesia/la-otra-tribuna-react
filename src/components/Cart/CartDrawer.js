// src/components/Cart/CartDrawer.js
import React from "react";
import { useNavigate } from "react-router-dom";
import Drawer from "../Drawer/Drawer";
import { useCart } from "./CartContext";
import { CurrencySelector } from "./CurrencySelector";
import "./CartDrawer.css";

// ✅ Función mejorada que acepta la moneda
function money(n, currency = "USD") {
  const amount = Number(n) || 0;
  
  // ✅ Si no hay moneda seleccionada, usar USD por defecto
  const currencyToUse = currency || "USD";
  
  if (currencyToUse === "USD") {
    const formatted = new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
    return formatted.replace("US$", "U$D");
  }
  
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: currencyToUse,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CartDrawer() {
  const { 
    isOpen, 
    closeCart, 
    items, 
    inc, 
    dec, 
    remove, 
    clear, 
    total,
    paymentCurrency,        // ✅ Cambio aquí
    changePaymentCurrency,  // ✅ Cambio aquí
    convertPrice
  } = useCart();
  
  const navigate = useNavigate();

  const goCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <Drawer
      open={isOpen}
      onClose={closeCart}
      title={`Tu carrito (${items.length})`}
      width={420}
      footer={
        items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <strong>{money(total, paymentCurrency)}</strong>
            </div>
            <div className="cart-actions">
              <button className="btn-clear" onClick={clear}>
                Vaciar
              </button>
              <button className="btn-primary" onClick={goCheckout}>
                Finalizar compra
              </button>
            </div>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty-illus" aria-hidden>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 3h2l.4 2M7 13h9l3-7H6.4"
                stroke="#9aa4b2"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="19" r="1.5" fill="#9aa4b2" />
              <circle cx="17" cy="19" r="1.5" fill="#9aa4b2" />
            </svg>
          </div>
          <p className="cart-empty-title">Tu carrito está vacío</p>
          <p className="cart-empty-sub">Agregá productos para verlos acá.</p>
        </div>
      ) : (
        <>
          {/* ✅ Selector de moneda con props correctos */}
          <div className="cart-currency-wrapper">
            <CurrencySelector
              paymentCurrency={paymentCurrency}
              onCurrencyChange={changePaymentCurrency}
              cartItems={items}
            />
          </div>

          {/* Lista de productos */}
          <ul className="cart-list">
            {items.map((p) => {
              const precioOriginal = Number(p.precio) || 0;
              const precioConvertido = convertPrice(precioOriginal, p.moneda);
              const mostrarConversion = paymentCurrency && p.moneda !== paymentCurrency;

              return (
                <li key={p.id} className="cart-item">
                  <img src={p.img} alt={p.nombre} className="cart-thumb" />
                  <div className="cart-info">
                    <div className="cart-name">{p.nombre}</div>
                    <div className="cart-meta">
                      {(p.club || "—")} • {p.categoria}
                    </div>

                    {/* ✅ Mostrar conversión si es necesario */}
                    {mostrarConversion && (
                      <div className="cart-conversion-info">
                        <span className="original-currency">
                          {money(precioOriginal, p.moneda)}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        <span className="converted-currency">
                          {money(precioConvertido, paymentCurrency)}
                        </span>
                      </div>
                    )}

                    <div className="cart-row">
                      <div className="qty">
                        <button onClick={() => dec(p.id)} aria-label="Quitar uno">
                          –
                        </button>
                        <input value={p.qty} readOnly aria-label="Cantidad" />
                        <button onClick={() => inc(p.id)} aria-label="Agregar uno">
                          +
                        </button>
                      </div>
                      <div className="cart-price">
                        {money(precioConvertido * p.qty, paymentCurrency)}
                      </div>
                    </div>
                  </div>
                  <button
                    className="cart-remove"
                    onClick={() => remove(p.id)}
                    aria-label="Quitar del carrito"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Drawer>
  );
}