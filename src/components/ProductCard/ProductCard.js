// src/components/ProductCard/ProductCard.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../Favorites/FavoritesContext";
import { useCart } from "../Cart/CartContext";
import "./ProductCard.css";

const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";
const money = (n)=> new Intl.NumberFormat("es-UY",{style:"currency",currency:"UYU",maximumFractionDigits:0}).format(n||0);

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { add: addToCart, isInCart } = useCart();
  const { items: favItems, toggle: toggleFav } = useFavorites();

  const isFav  = favItems.some(p => p.id === product.id);
  const inCart = isInCart(product.id);

  const isOffer   = product.isOffer === true;
  const priceOld  = isOffer ? (product.precioAnterior ?? product.precio ?? null) : null;
  const priceNew  = isOffer ? (product.precio_oferta ?? product.precio ?? 0)   : (product.precio ?? 0);

  const normalized = {
    id: product.id,
    nombre: product.nombre,
    precio: priceNew,
    img: product.img || PLACEHOLDER,
    club: product.club,
    categoria: product.categoria,
  };

  const goDetail = () => navigate(`/publication/${product.id}`);
  const onKeyGo = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goDetail();
    }
  };

  return (
    <article className="card">
      {/* CLIC EN IMAGEN -> DETALLE */}
      <div className="media" onClick={goDetail} role="button" tabIndex={0} onKeyDown={onKeyGo}>
        <img
          src={product.img || PLACEHOLDER}
          alt={product.nombre}
          loading="lazy"
          onError={(e)=>{ e.currentTarget.src = PLACEHOLDER; }}
        />
        {/* Favorito NO navega */}
        <button
          className={`fav-toggle ${isFav ? "active" : ""}`}
          type="button"
          onClick={(e)=>{ e.stopPropagation(); toggleFav(normalized); }}
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
          title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          {isFav ? "❤️" : "🤍"}
        </button>
        {isOffer && <span className="badge-offer">-10%</span>}
      </div>

      {/* CLIC EN TÍTULO/META -> DETALLE */}
      <div className="body">
        <div className="meta" onClick={goDetail} role="button" tabIndex={0}>
          <div>
            <div className="title-2lines">{product.nombre}</div>
            <div className="muted subtitle-1line">
              {(product.club || "—")} • {product.categoria}
            </div>
          </div>
          <div className="price" style={{textAlign:"right"}}>
            {isOffer ? (
              <>
                <div className="price-old">{money(priceOld)}</div>
                <div className="price-new">{money(priceNew)}</div>
              </>
            ) : (
              <div style={{fontWeight:700}}>{money(priceNew)}</div>
            )}
          </div>
        </div>

        {/* Botón carrito NO navega */}
        <button
          className="btn primary"
          type="button"
          onClick={(e)=>{ e.stopPropagation(); addToCart(normalized, 1); }}
          aria-label={inCart ? "Agregar otra unidad" : "Agregar al carrito"}
        >
          {inCart ? "Agregar otro" : "Agregar al carrito"}
        </button>
      </div>
    </article>
  );
}