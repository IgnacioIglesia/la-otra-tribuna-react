import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header/Header";
import { supabase } from "../../lib/supabaseClient";
import { useCart } from "../../components/Cart/CartContext";
import { useFavorites } from "../../components/Favorites/FavoritesContext";
import "./Publication.css";

const PLACEHOLDER = "https://placehold.co/1200x900?text=Camiseta";

/* ===== Utils ===== */
function money(n, curr = "UYU") {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: curr,
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function initialsFrom(nombre = "", apellido = "", email = "") {
  const ini = (nombre?.trim()?.[0] || "") + (apellido?.trim()?.[0] || "");
  return (ini || email?.[0] || "?").toUpperCase();
}

/** Añade params de transformación (format/webp, width, quality) sin romper URLs ya con query */
function ensureWebP(url, { width, quality = 75 } = {}) {
  if (!url) return url;
  try {
    const hasQuery = url.includes("?");
    const params = new URLSearchParams();
    params.set("format", "webp");
    if (width) params.set("width", String(width));
    if (quality) params.set("quality", String(quality));
    return url + (hasQuery ? "&" : "?") + params.toString();
  } catch {
    return url;
  }
}

export default function Publication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add: addToCart } = useCart();
  const { items: favItems, toggle: toggleFav } = useFavorites();

  const [loading, setLoading] = useState(true);
  const [pub, setPub] = useState(null);
  const [seller, setSeller] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false); // 👈 para el fade-in / blur

  const isFav = useMemo(
    () => favItems.some((x) => x.id === Number(id)),
    [favItems, id]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      setImgLoaded(false);

      try {
        // 1) Publicación + fotos
        const { data, error: e1 } = await supabase
          .from("publicacion")
          .select("*, foto (url, orden_foto, url_thumb)")
          .eq("id_publicacion", id)
          .maybeSingle();

        if (e1) throw e1;
        if (!data) {
          if (alive) setError("No encontramos esta publicación.");
          return;
        }

        // 2) Vendedor (sin email por privacidad)
        let sellerData = null;
        let verified = false;

        if (data.id_usuario) {
          const { data: u } = await supabase
            .from("usuario")
            .select("id_usuario, nombre, apellido")
            .eq("id_usuario", data.id_usuario)
            .maybeSingle();

          sellerData = u || null;

          // 3) Verificación de identidad
          if (u?.id_usuario) {
            const { data: verif } = await supabase
              .from("verificacion_identidad")
              .select("estado")
              .eq("id_usuario", u.id_usuario)
              .eq("estado", "aceptado")
              .maybeSingle();

            verified = !!verif;
          }
        }

        if (alive) {
          setPub(data);
          setSeller(sellerData);
          setIsVerified(verified);
        }
      } catch (err) {
        if (alive) setError(err.message || "Error cargando publicación.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
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
  const fotos = (pub.foto || []).sort(
    (a, b) => (a.orden_foto || 0) - (b.orden_foto || 0)
  );
  const raw = fotos.length ? fotos[0].url : PLACEHOLDER;
  const rawThumb = fotos.length ? (fotos[0].url_thumb || fotos[0].url) : PLACEHOLDER;

  // Servimos WebP (si URL admite query params / Supabase Storage)
  const img = ensureWebP(raw, { width: 960, quality: 78 });
  const imgThumb = ensureWebP(rawThumb, { width: 480, quality: 70 });

  const normalized = {
    id: pub.id_publicacion,
    nombre: pub.titulo,
    precio: Number(pub.precio || 0),
    img,
    imgThumb,
    club: pub.club || "",
    categoria:
      pub.categoria === "Seleccion" ? "Selección" : pub.categoria || "Club",
    moneda: pub.moneda || "UYU",
    talle: pub.talle || "",
  };

  return (
    <>
      <Header />

      <main className="container pub-page">
        <section className="pub-card">
          <div className="pub-layout">
            {/* ===== IMAGEN ===== */}
            <div
              className={`pub-media ${imgLoaded ? "is-ready" : ""}`}
              style={{ "--blur-bg": `url("${imgThumb}")` }}
            >
              <picture>
                {/* Preferimos WebP (thumb + grande) */}
                <source
                  type="image/webp"
                  srcSet={`${imgThumb} 480w, ${img} 960w`}
                  sizes="(max-width: 640px) 100vw, 720px"
                />
                {/* Fallback */}
                <img
                  className="pub-img"
                  src={img}
                  alt={pub.titulo}
                  /* Pedimos YA para evitar el flash */
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                  width="720"
                  height="900"
                  onLoad={() => setImgLoaded(true)}
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER;
                    setImgLoaded(true);
                  }}
                />
              </picture>

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
              <button className="back" onClick={() => navigate(-1)}>
                ← Volver
              </button>

              <h1 className="pub-title">{pub.titulo}</h1>

              <div className="pub-submeta">
                {pub.club || "—"} • {normalized.categoria} • Talle{" "}
                {pub.talle || "—"} • {pub.condicion || "—"}
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

              {/* Descripción */}
              {pub.descripcion && (
                <div style={{ marginTop: 18 }}>
                  <h3 style={{ margin: "0 0 6px", fontWeight: 700 }}>
                    Descripción
                  </h3>
                  <p style={{ whiteSpace: "pre-wrap", color: "#374151" }}>
                    {pub.descripcion}
                  </p>
                </div>
              )}

              {/* SELLER */}
              <section className="seller-card">
                <div className="seller-left">
                  <div className="avatar">
                    {initialsFrom(seller?.nombre, seller?.apellido)}
                  </div>
                  <div>
                    <button
                      className="seller-link"
                      onClick={() => navigate(`/seller/${seller?.id_usuario}`)}
                      aria-label={`Ver publicaciones de ${seller?.nombre || ""}`}
                    >
                      <div className="seller-name">
                        {seller?.nombre || "Usuario"}
                        {seller?.apellido ? ` ${seller.apellido}` : ""}
                        {isVerified && (
                          <svg
                            className="verified-badge"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            style={{
                              display: "inline-block",
                              marginLeft: "6px",
                              verticalAlign: "middle",
                            }}
                          >
                            <path
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              stroke="#3b82f6"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="#dbeafe"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
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
