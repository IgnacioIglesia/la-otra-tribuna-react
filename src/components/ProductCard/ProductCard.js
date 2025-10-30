// ===== ProductCard.js =====
import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../Cart/CartContext";
import { useFavorites } from "../Favorites/FavoritesContext";
import "./ProductCard.css";

// ✅ Función mejorada que acepta la moneda y formatea correctamente USD como U$D
function money(n, currency = "USD") {
  const amount = Number(n) || 0;
  
  if (currency === "USD") {
    const formatted = new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
    
    // Reemplazar "US$" por "U$D"
    return formatted.replace("US$", "U$D");
  }
  
  // Para UYU y otras monedas
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductCard({ product }) {
  const { add, remove, getQty } = useCart();
  const { isFavorite, toggle } = useFavorites();

  const {
    id,
    nombre,
    precio,
    img,
    club,
    categoria,
    stock = 0,
    isOwn = false,
    // ✅ Ofertas
    isOffer = false,
    precioAnterior,
    precio_oferta,
    // ✅ Talle
    talle,
    // ✅ IMPORTANTE: moneda (ahora por defecto USD)
    moneda = "USD",
  } = product;

  const qtyInCart = getQty(id);
  const canAdd = !isOwn && stock > 0;
  const atMax = stock > 0 && qtyInCart >= stock;
  const isFav = isFavorite(id);
  const isInCart = qtyInCart > 0;

  const precioFinal = isOffer && precio_oferta ? precio_oferta : precio;
  const mostrarDescuento =
    isOffer && precioAnterior && precioAnterior > precioFinal;

  const onAdd = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canAdd) return;
    await add(product, 1);
  };

  const onAddMore = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (atMax) return;
    await add(product, 1);
  };

  const onRemove = (e) => {
    e.stopPropagation();
    e.preventDefault();
    remove(id);
  };

  const onToggleFavorite = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggle(product);
  };

  const detailsHref = `/publication/${id}`;

  return (
    <article className="card">
      {/* Badge de descuento */}
      {mostrarDescuento && (
        <span className="badge-offer">
          -{Math.round(((precioAnterior - precioFinal) / precioAnterior) * 100)}%
        </span>
      )}

      {/* Favoritos */}
      <button
        className={`fav-btn ${isFav ? "is-fav" : ""}`}
        onClick={onToggleFavorite}
        aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
        title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={isFav ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {/* Imagen */}
      <Link to={detailsHref} className="card-click" aria-label={nombre}>
        <div className="media">
          <img src={img} alt={nombre} loading="lazy" />
        </div>
      </Link>

      {/* Cuerpo */}
      <div className="body">
        <div className="meta">
          <div>
            <Link to={detailsHref} className="card-title-link">
              <h3 className="card-title" title={nombre}>
                {nombre}
              </h3>
            </Link>

            {/* ✅ Subtítulo con talle */}
            <div className="card-subtitle">
              {(club || "—")} • {categoria}
              {talle ? ` • Talle ${talle}` : ""}
            </div>
          </div>

          <div className="price">
            {mostrarDescuento && (
              <div className="price-old">{money(precioAnterior, moneda)}</div>
            )}
            <div className="price-new">{money(precioFinal, moneda)}</div>
            <div className={`pc-stock-mini ${stock <= 0 ? "is-out" : ""}`}>
              {stock <= 0 ? "Sin stock" : `Stock: ${stock}`}
            </div>
            {talle && (
              <div className="pc-talle">
                Talle: <span>{talle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        {isOwn ? (
  <div className="pc-own-msg" role="note">
    No podés agregar al carrito publicaciones tuyas.
  </div>
) : (
  <div className="card-actions">
    {!isInCart ? (
      // ✅ No está en el carrito - Botón normal
      <button
        className="btn primary"
        onClick={onAdd}
        disabled={!canAdd}
        title={stock <= 0 ? "Sin stock" : "Agregar al carrito"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        Agregar al carrito
      </button>
    ) : (
      // ✅ Está en el carrito - Mostrar cantidad y controles
      <>
        {/* ✅ Estado en carrito CON aviso de máximo integrado */}
        <div className={`cart-status ${atMax ? "at-max" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span className="cart-qty-text">
            {qtyInCart} en el carrito
            {atMax && <span className="max-badge">• Máximo</span>}
          </span>
        </div>

        {/* ✅ Botones en una sola fila */}
        <div className="cart-actions-group">
          {stock > 1 && !atMax && (
            <button
              className="btn secondary-compact"
              onClick={onAddMore}
              title="Agregar una más"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Agregar otra
            </button>
          )}
          
          <button
            className="btn danger-compact"
            onClick={onRemove}
            title="Eliminar del carrito"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Eliminar
          </button>
        </div>
      </>
    )}
  </div>
)}
      </div>
    </article>
  );
}