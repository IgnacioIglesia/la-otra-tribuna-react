// ===== ProductCard.js =====
import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../Cart/CartContext";
import { useFavorites } from "../Favorites/FavoritesContext";
import "./ProductCard.css";

function money(n) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export default function ProductCard({ product }) {
  const { add, getQty } = useCart();
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
    // ✅ Campos para manejar ofertas
    isOffer = false,
    precioAnterior,
    precio_oferta,
  } = product;

  const qtyInCart = getQty(id);
  const canAdd = !isOwn && stock > 0;
  const atMax = stock > 0 && qtyInCart >= stock;
  const isFav = isFavorite(id);

  // ✅ Determinar qué precio mostrar
  const precioFinal = isOffer && precio_oferta ? precio_oferta : precio;
  const mostrarDescuento = isOffer && precioAnterior && precioAnterior > precioFinal;

  const onAdd = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canAdd) return;
    add(product, 1);
  };

  const onAddMore = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (atMax) return;
    add(product, 1);
  };

  const onToggleFavorite = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggle(product);
  };

  const detailsHref = `/publication/${id}`;

  return (
    <article className="card">
      {/* ✅ Badge de descuento - ARRIBA A LA IZQUIERDA */}
      {mostrarDescuento && (
        <span className="badge-offer">
          -{Math.round(((precioAnterior - precioFinal) / precioAnterior) * 100)}%
        </span>
      )}

      {/* Botón de favoritos - ARRIBA A LA DERECHA */}
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

      {/* Imagen clickeable */}
      <Link to={detailsHref} className="card-click" aria-label={nombre}>
        <div className="media">
          <img src={img} alt={nombre} loading="lazy" />
        </div>
      </Link>

      {/* Cuerpo */}
      <div className="body">
        {/* Meta + precio */}
        <div className="meta">
          <div>
            <Link to={detailsHref} className="card-title-link">
              <h3 className="card-title" title={nombre}>
                {nombre}
              </h3>
            </Link>
            <div className="card-subtitle">
              {(club || "—")} • {categoria}
            </div>
          </div>

          <div className="price">
            {/* ✅ Mostrar precio anterior tachado si hay descuento */}
            {mostrarDescuento && (
              <div className="price-old">{money(precioAnterior)}</div>
            )}
            {/* ✅ Precio final (con o sin descuento) */}
            <div className="price-new">{money(precioFinal)}</div>
            <div className={`pc-stock-mini ${stock <= 0 ? "is-out" : ""}`}>
              {stock <= 0 ? "Sin stock" : `Stock: ${stock}`}
            </div>
          </div>
        </div>

        {/* Acciones */}
        {isOwn ? (
          <div className="pc-own-msg" role="note">
            No podés agregar al carrito publicaciones tuyas.
          </div>
        ) : (
          <>
            <button
              className="btn primary"
              onClick={onAdd}
              disabled={!canAdd}
              title={stock <= 0 ? "Sin stock" : "Agregar al carrito"}
            >
              Agregar al carrito
            </button>

            {stock > 1 && qtyInCart > 0 && (
              <button
                className="btn secondary"
                onClick={onAddMore}
                disabled={atMax}
                title={atMax ? "Alcanzaste el stock disponible" : "Agregar una más"}
              >
                Agregar una más {atMax ? "(máx.)" : ""}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}