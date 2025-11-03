// src/components/Favorites/FavoritesDrawer.js
import React from "react";
import { useNavigate } from "react-router-dom";
import Drawer from "../Drawer/Drawer";
import { useFavorites } from "./FavoritesContext";
import "./FavoritesDrawer.css";

const PLACEHOLDER =
  "https://placehold.co/80x80?text=Foto&font=inter&background=EEE&foreground=999";

/* Formatea moneda respetando USD -> U$D */
function money(n, curr = "UYU") {
  const amount = Number(n || 0);
  if (curr === "USD") {
    return new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("US$", "U$D");
  }
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function FavoritesDrawer() {
  const { isOpen, closeFavorites, items, remove, clear } = useFavorites();
  const navigate = useNavigate();

  const goTo = (id) => {
    closeFavorites();
    navigate(`/publication/${id}`);
  };

  return (
    <Drawer
      open={isOpen}
      onClose={closeFavorites}
      title={`Favoritos (${items.length})`}
      width={380}
      footer={
        items.length > 0 && (
          <div className="fav-footer">
            <button className="btn-clear" onClick={clear}>
              Limpiar todo
            </button>
            <button className="btn-primary" onClick={closeFavorites}>
              Cerrar
            </button>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <div className="fav-empty">
          <svg
            className="fav-empty-ic"
            width="96"
            height="96"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12.1 21.35c-.08.05-.18.05-.26 0C7.14 18.27 4 15.36 4 11.9 4 9.5 5.9 7.6 8.3 7.6c1.37 0 2.68.63 3.5 1.64.82-1.01 2.13-1.64 3.5-1.64 2.4 0 4.3 1.9 4.3 4.3 0 3.46-3.14 6.37-7.5 9.45Z"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>

          <p className="fav-empty-title">Aún no agregaste favoritos</p>
          <p className="fav-empty-sub">
            Tocá el corazón en una publicación para guardarla aquí.
          </p>
        </div>
      ) : (
        <ul className="fav-list">
          {items.map((p) => (
            <li
              key={p.id}
              className="fav-item"
              role="button"
              tabIndex={0}
              onClick={() => goTo(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goTo(p.id);
              }}
              title="Ver publicación"
            >
              <img
                src={p.img || PLACEHOLDER}
                alt={p.nombre}
                className="fav-thumb"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />

              <div className="fav-info">
                <div className="fav-name" title={p.nombre}>
                  {p.nombre}
                </div>
                <div className="fav-meta">
                  {(p.club || "—")} • {p.categoria}
                </div>
                <div className="fav-price">{money(p.precio, p.moneda || "UYU")}</div>
              </div>

              <button
                className="fav-remove"
                onClick={(e) => {
                  e.stopPropagation(); // 👈 no navegar
                  remove(p.id);
                }}
                aria-label="Quitar de favoritos"
                title="Quitar"
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
