import React from "react";
import { Link, useNavigate } from "react-router-dom";
import HeaderSimplifFAV from "../../components/HeaderSimplif/HeaderSimplifFAV";
import { useFavorites } from "../../components/Favorites/FavoritesContext";
import { useCart } from "../../components/Cart/CartContext";
import "./Favorites.css";

const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";

const money = (n = 0, cur = "UYU") =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export default function Favorites() {
  const navigate = useNavigate();
  const { items, remove, clear } = useFavorites();
  const { add: addToCart } = useCart();

  const goTo = (id) => navigate(`/publication/${id}`);

  return (
    <>
      <HeaderSimplifFAV />

      <main className="fav-wrap">
        <section className="fav-card">
          <header className="fav-header">
            <div>
              <h1>Favoritos</h1>
              <p className="lead">Guardá y compará las camisetas que más te gustan.</p>
            </div>

            {items.length > 0 && (
              <button
                className="btn ghost"
                type="button"
                onClick={clear}
                aria-label="Vaciar favoritos"
                title="Vaciar favoritos"
              >
                Vaciar lista
              </button>
            )}
          </header>

          {items.length === 0 ? (
            <div className="fav-empty">
              <div className="empty-illus" aria-hidden>
                <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3h2l.4 2M7 13h9l3-7H6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="19" r="1.5" fill="currentColor"/>
                  <circle cx="17" cy="19" r="1.5" fill="currentColor"/>
                </svg>
              </div>
              <h3>Tu lista está vacía</h3>
              <p>Agregá favoritos para verlos acá y decidir después.</p>
              {/* ✅ Cambié el Link para que vaya directo al catálogo */}
              <Link to="/#catalogo" className="btn ghost">Explorar catálogo</Link>
            </div>
          ) : (
            <div className="fav-grid">
              {items.map((p) => {
                const img = p.img || PLACEHOLDER;
                const nombre = p.nombre || "Publicación";
                const price = p.precio != null ? money(p.precio) : null;

                return (
                  <article key={p.id} className="fav-item">
                    <button
                      className="thumb"
                      onClick={() => goTo(p.id)}
                      aria-label={`Abrir ${nombre}`}
                      title={nombre}
                    >
                      <img
                        src={img}
                        alt={nombre}
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                      />
                    </button>

                    <div className="fav-info">
                      <h4 className="fav-title" title={nombre}>
                        <button
                          className="linklike"
                          onClick={() => goTo(p.id)}
                          aria-label={`Abrir ${nombre}`}
                        >
                          {nombre}
                        </button>
                      </h4>

                      <div className="fav-sub">
                        {(p.club || "—")} • {p.categoria || "—"}
                      </div>

                      {price && <span className="price">{price}</span>}
                    </div>

                    <div className="fav-actions">
                      <button
                        className="btn primary"
                        onClick={() =>
                          addToCart(
                            {
                              id: p.id,
                              nombre: p.nombre,
                              img,
                              precio: p.precio,
                              club: p.club,
                              categoria: p.categoria,
                            },
                            1
                          )
                        }
                      >
                        Agregar al carrito
                      </button>

                      <button className="btn danger" onClick={() => remove(p.id)}>
                        Quitar
                      </button>

                      <button className="btn link" onClick={() => goTo(p.id)}>
                        Ver
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}