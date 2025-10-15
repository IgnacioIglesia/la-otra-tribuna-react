// src/components/Cart/CartDrawer.js
import React from "react";
import Drawer from "../Drawer/Drawer";
import { useCart } from "./CartContext";
import "./CartDrawer.css";

function money(n) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function CartDrawer() {
  const { isOpen, closeCart, items, inc, dec, remove, clear, total } = useCart();

  return (
    <Drawer
      open={isOpen}
      onClose={closeCart}
      title={`Tu carrito (${items.length})`}
      width={380}
      footer={
        items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="cart-actions">
              <button className="btn-clear" onClick={clear}>
                Vaciar
              </button>
              <button className="btn-primary" onClick={closeCart}>
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
        <ul className="cart-list">
          {items.map((p) => (
            <li key={p.id} className="cart-item">
              <img src={p.img} alt={p.nombre} className="cart-thumb" />
              <div className="cart-info">
                <div className="cart-name">{p.nombre}</div>
                <div className="cart-meta">
                  {(p.club || "—")} • {p.categoria}
                </div>
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
                  <div className="cart-price">{money(p.precio * p.qty)}</div>
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
          ))}
        </ul>
      )}
    </Drawer>
  );
}