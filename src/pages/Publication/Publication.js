import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header/Header";
import { supabase } from "../../lib/supabaseClient";
import { useCart } from "../../components/Cart/CartContext";
import { useFavorites } from "../../components/Favorites/FavoritesContext";
import "./Publication.css";

const PLACEHOLDER = "https://placehold.co/1200x900?text=Camiseta";

function money(n, curr = "UYU") {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: curr,
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function initialsFrom(nombre = "", apellido = "", email = "") {
  const ini =
    (nombre?.trim()?.[0] || "") + (apellido?.trim()?.[0] || "");
  return (ini || email?.[0] || "?").toUpperCase();
}

export default function Publication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add: addToCart } = useCart();
  const { items: favItems, toggle: toggleFav } = useFavorites();

  const [loading, setLoading] = useState(true);
  const [pub, setPub] = useState(null);
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState("");

  const isFav = useMemo(
    () => favItems.some((x) => x.id === Number(id)),
    [favItems, id]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        // 1) Publicación + fotos
        const { data, error: e1 } = await supabase
          .from("publicacion")
          .select("*, foto (url, orden_foto)")
          .eq("id_publicacion", id)
          .maybeSingle();

        if (e1) throw e1;
        if (!data) {
          if (alive) setError("No encontramos esta publicación.");
          return;
        }

        // 2) Vendedor (permití SELECT público con RLS o usá una vista pública)
        let sellerData = null;
        if (data.id_usuario) {
          const { data: u } = await supabase
            .from("usuario") // si creaste la vista: 'v_usuario_publico'
            .select("id_usuario, nombre, apellido, email")
            .eq("id_usuario", data.id_usuario)
            .maybeSingle();
          sellerData = u || null;
        }

        if (alive) {
          setPub(data);
          setSeller(sellerData);
        }
      } catch (err) {
        if (alive) setError(err.message || "Error cargando publicación.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="container pub-page">
          <div className="empty">Cargando publicación…</div>
        </main>
      </>
    );
  }

  if (error || !pub) {
    return (
      <>
        <Header />
        <main className="container pub-page">
          <div className="empty">{error || "No encontramos esta publicación."}</div>
        </main>
      </>
    );
  }

  // Normalización
  const fotos = (pub.foto || []).sort((a, b) => (a.orden_foto || 0) - (b.orden_foto || 0));
  const img = fotos.length ? fotos[0].url : PLACEHOLDER;

  const normalized = {
    id: pub.id_publicacion,
    nombre: pub.titulo,
    precio: Number(pub.precio || 0),
    img,
    club: pub.club || "",
    categoria: pub.categoria === "Seleccion" ? "Selección" : (pub.categoria || "Club"),
  };

  return (
    <>
      <Header />

      <main className="container pub-page">
        <section className="pub-card">
          <div className="pub-layout">
            {/* ===== IMAGEN ===== */}
            <div className="pub-media">
              <img
                src={img}
                alt={pub.titulo}
                onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
              />
              <button
                className={`fav-chip ${isFav ? "is-active" : ""}`}
                onClick={() => toggleFav(normalized)}
                aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
              >
                {isFav ? "❤️" : "🤍"}
              </button>
            </div>

            {/* ===== INFO ===== */}
            <div className="pub-info">
              <button className="back" onClick={() => navigate(-1)}>← Volver</button>

              <h1 className="pub-title">{pub.titulo}</h1>

              <div className="pub-submeta">
                {pub.club || "—"} • {normalized.categoria} • Talle {pub.talle || "—"} • {pub.condicion || "—"}
              </div>

              <div className="pub-price">
                {money(pub.precio, pub.moneda || "UYU")}
              </div>

              <div className="pub-attrs">
                <div>
                  <span className="k">Autenticidad</span>
                  <span className="v">{pub.autenticidad || "—"}</span>
                </div>
                <div>
                  <span className="k">Stock</span>
                  <span className="v">{pub.stock ?? "—"}</span>
                </div>
                <div>
                  <span className="k">Estado</span>
                  <span className="v">{pub.estado || "—"}</span>
                </div>
              </div>

              <div className="pub-actions">
                <button
                  className="lot-btn-primary"
                  onClick={() => addToCart(normalized, 1)}
                >
                  Agregar al carrito
                </button>
                <button
                  className="lot-btn-secondary"
                  onClick={() => toggleFav(normalized)}
                >
                  {isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                </button>
              </div>

              <div className="pub-badges">
                <span>✔ Pago seguro</span>
                <span>🚚 Envíos a todo el país</span>
                <span>🔁 Devoluciones simples</span>
              </div>

              {/* Descripción (si hay) */}
              {pub.descripcion && (
                <div style={{ marginTop: 18 }}>
                  <h3 style={{ margin: "0 0 6px", fontWeight: 700 }}>Descripción</h3>
                  <p style={{ whiteSpace: "pre-wrap", color: "#374151" }}>{pub.descripcion}</p>
                </div>
              )}

              {/* SELLER – SIEMPRE visible con fallback */}
              <section className="seller-card">
                <div className="seller-left">
                  <div className="avatar">
                    {initialsFrom(seller?.nombre, seller?.apellido, seller?.email)}
                  </div>
                  <div>
                    <div className="seller-name">
                      {seller?.nombre || seller?.email?.split("@")[0] || "Usuario"}
                      {seller?.apellido ? ` ${seller.apellido}` : ""}
                    </div>
                    <div className="seller-sub">
                        {seller?.email || "Email no disponible"}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}