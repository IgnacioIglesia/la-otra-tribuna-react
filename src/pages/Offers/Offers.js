import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import ProductCard from "../../components/ProductCard/ProductCard";
import { supabase } from "../../lib/supabaseClient";
import "./Offers.css";

const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";

function daysFrom(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function mapCategoria(cat) {
  if (!cat) return "Club";
  return cat === "Seleccion" ? "Selección" : cat;
}

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);

  /* ===== Filtros ===== */
  const [sort, setSort] = useState("default");
  const [coleccion, setColeccion] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [equipo, setEquipo] = useState("Todos");
  const [maxPrecio, setMaxPrecio] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("publicacion")
        .select(`
          id_publicacion,
          titulo,
          precio,
          precio_oferta,
          categoria,
          coleccion,
          estado,
          permiso_oferta,
          fecha_publicacion,
          club,
          stock,
          foto ( url, orden_foto )
        `)
        .eq("estado", "Activa")
        .eq("permiso_oferta", true)
        .gt("stock", 0)
        .order("orden_foto", { foreignTable: "foto", ascending: true });

      if (error) {
        console.error(error);
        setAll([]);
        setLoading(false);
        return;
      }

      const mapped = (data || [])
        .filter((p) => daysFrom(p.fecha_publicacion) >= 30) // 30 días
        .map((pub) => {
          const foto = pub.foto?.[0]?.url || PLACEHOLDER;
          const basePrice = Number(pub.precio);
          const offerPrice =
            pub.precio_oferta != null
              ? Number(pub.precio_oferta)
              : Math.round(basePrice * 0.9);

          return {
            id: pub.id_publicacion,
            nombre: pub.titulo,
            club: pub.club || "",
            categoria: mapCategoria(pub.categoria),
            coleccion: pub.coleccion || "Actual",
            img: foto,
            stock: Number(pub.stock) || 0,
            // flags para ProductCard
            isOffer: true,
            precio: basePrice,
            precioAnterior: basePrice,
            precio_oferta: offerPrice,
          };
        });

      setAll(mapped);
      setLoading(false);
    })();
  }, []);

  // Reset filtros dependientes cuando cambia colección
  useEffect(() => {
    if (!coleccion || coleccion === "Todas") {
      setCategoria("Todas");
      setEquipo("Todos");
    }
  }, [coleccion]);

  const hasColeccion = !!coleccion && coleccion !== "Todas";
  const hasCategoria = hasColeccion && categoria !== "Todas";

  // Categorías disponibles según colección
  const categorias = useMemo(() => {
    const base = hasColeccion ? all.filter(p => p.coleccion === coleccion) : all;
    const unique = Array.from(new Set(base.map((p) => p.categoria).filter(Boolean)));
    const allowed = ["Club", "Selección"];
    const filtered = unique.filter((c) => allowed.includes(c));
    return ["Todas", ...filtered];
  }, [all, hasColeccion, coleccion]);

  // Equipos disponibles según colección y categoría
  const equipos = useMemo(() => {
    const baseColeccion = hasColeccion ? all.filter(p => p.coleccion === coleccion) : all;
    if (categoria === "Todas") {
      const list = Array.from(new Set(baseColeccion.map((p) => p.club).filter(Boolean)));
      return ["Todos", ...list];
    }
    const base = baseColeccion.filter((p) => p.categoria === categoria);
    const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
    return ["Todos", ...list];
  }, [all, hasColeccion, coleccion, categoria]);

  // Precio máximo absoluto
  const maxPrecioAbsoluto = useMemo(() => {
    if (!all.length) return 0;
    return Math.max(...all.map((p) => Number(p.precioAnterior || p.precio) || 0));
  }, [all]);

  useEffect(() => {
    if (maxPrecioAbsoluto > 0) setMaxPrecio(maxPrecioAbsoluto);
  }, [maxPrecioAbsoluto]);

  const pct = maxPrecioAbsoluto
    ? Math.max(0, Math.min(100, (maxPrecio / maxPrecioAbsoluto) * 100))
    : 0;

  // Filtrado y ordenamiento
  const productos = useMemo(() => {
    let list = all.filter(
      (p) =>
        (coleccion === "" || coleccion === "Todas" || p.coleccion === coleccion) &&
        (categoria === "Todas" || p.categoria === categoria) &&
        (equipo === "Todos" || p.club === equipo) &&
        (Number(p.precioAnterior || p.precio) || 0) <= (Number(maxPrecio) || 0)
    );

    switch (sort) {
      case "price-asc":
        list = list.slice().sort((a, b) => (a.precio_oferta ?? a.precio) - (b.precio_oferta ?? b.precio));
        break;
      case "price-desc":
        list = list.slice().sort((a, b) => (b.precio_oferta ?? b.precio) - (a.precio_oferta ?? a.precio));
        break;
      case "name":
        list = list.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      default:
        break;
    }

    return list;
  }, [all, coleccion, categoria, equipo, maxPrecio, sort]);

  return (
    <>
      <Header />

      <section
        className="hero hero-offers"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('/assets/oferta.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="container hero-content">
          <h2 className="hero-subtitle">Los mejores descuentos</h2>
          <p className="hero-desc">Aprovechá nuestras promos por tiempo limitado.</p>
        </div>
      </section>

      <main className="container catalog">
        <div className="catalog-head">
          <h2 className="catalog-title">Ofertas disponibles</h2>
          {!loading && (
            <p className="catalog-sub">Resultados: {productos.length}</p>
          )}
        </div>

        {/* TOOLBAR - Mismo estilo que Home */}
        <div className="filters-toolbar">
          <div className="ft-left">
            {/* Ordenar */}
            <div className="ft-field">
              <span className="ft-icon" aria-hidden>↕︎</span>
              <select
                aria-label="Ordenar"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="default">Por defecto</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
                <option value="name">Nombre (A–Z)</option>
              </select>
            </div>

            {/* Colección */}
            <div className="ft-field">
              <span className="ft-icon" aria-hidden>🗂️</span>
              <select
                aria-label="Colección"
                value={coleccion}
                onChange={(e) => setColeccion(e.target.value)}
                required
              >
                <option value="" disabled hidden>Elegí colección</option>
                <option value="Todas">Todas</option>
                <option value="Actual">Actual</option>
                <option value="Retro">Retro</option>
              </select>
            </div>

            {/* Categoría */}
            <div className="ft-field">
              <span className="ft-icon" aria-hidden>🏷️</span>
              <select
                aria-label="Categoría"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={!hasColeccion}
              >
                {["Todas", ...categorias.filter((c) => c !== "Todas")].map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Equipo */}
            <div className="ft-field">
              <span className="ft-icon" aria-hidden>⚽️</span>
              <select
                aria-label="Equipo"
                value={hasCategoria ? equipo : ""}
                onChange={(e) => setEquipo(e.target.value)}
                disabled={!hasCategoria}
              >
                {!hasCategoria ? (
                  <option value="" disabled>Elegí categoría</option>
                ) : (
                  equipos.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq === "Todos" ? "Todos" : eq}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Precio */}
            <div className="ft-price">
              <span className="ft-price-label">Precio máx.:</span>
              <span className="ft-price-value">
                ${Number(maxPrecio || 0).toLocaleString("es-UY")}
              </span>
              <input
                type="range"
                min="0"
                max={maxPrecioAbsoluto || 0}
                step="50"
                value={maxPrecio || 0}
                onChange={(e) => setMaxPrecio(Number(e.target.value))}
                style={{ "--pct": `${pct}%` }}
                aria-label="Precio máximo"
              />
            </div>

            {/* Reset */}
            <button
              className="ft-reset"
              type="button"
              onClick={() => {
                setSort("default");
                setColeccion("");
                setCategoria("Todas");
                setEquipo("Todos");
                setMaxPrecio(maxPrecioAbsoluto || 0);
              }}
              title="Restablecer filtros"
              disabled={loading}
            >
              Restablecer
            </button>
          </div>
        </div>

        {/* ESTADOS */}
        {loading && <div className="empty">Cargando ofertas…</div>}

        {/* GRILLA */}
        {!loading && (
          productos.length === 0 ? (
            <div className="empty">No hay productos en oferta que coincidan con tus filtros.</div>
          ) : (
            <section className="products-grid">
              {productos.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </section>
          )
        )}
      </main>
    </>
  );
}