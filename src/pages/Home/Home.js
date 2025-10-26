import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import ProductCard from "../../components/ProductCard/ProductCard";
import { supabase } from "../../lib/supabaseClient";
import "./Home.css";

/* ===== Utils ===== */
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

const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";
const HERO_IMGS = ["/assets/fondo1.png", "/assets/fondo2.png", "/assets/fondo3.png", "/assets/fondo4.png"];

export default function Home() {
  /* ===== Hero rotativo ===== */
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    HERO_IMGS.forEach((src) => {
      const i = new Image();
      i.src = src;
    });
  }, []);
  
  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % HERO_IMGS.length);
        setFading(false);
      }, 250);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  /* ===== Session (para detectar dueños) ===== */
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id ?? null);
    })();
  }, []);

  /* ===== Data ===== */
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from("publicacion")
          .select(`
            id_publicacion,
            id_usuario,
            titulo,
            precio,
            categoria,
            coleccion,
            estado,
            permiso_oferta,
            fecha_publicacion,
            club,
            stock,
            foto ( url, orden_foto )
          `)
          .eq("estado", "Activa")      // ✅ Solo publicaciones activas
          .gt("stock", 0)               // ✅ Solo con stock disponible
          .order("id_publicacion", { ascending: false })
          .order("orden_foto", { foreignTable: "foto", ascending: true });

        if (error) throw error;

        // Filtrar según tu regla de oferta
        const filtered = (data || []).filter((pub) => {
          const enOferta =
            pub.permiso_oferta === true &&
            daysFrom(pub.fecha_publicacion) >= 30;
          return !enOferta;
        });

        // Mapear a modelo de tarjeta
        const mapped = filtered.map((pub) => {
          const primeraFoto =
            Array.isArray(pub.foto) && pub.foto.length ? pub.foto[0].url : null;
          return {
            id: pub.id_publicacion,
            ownerId: pub.id_usuario,
            isOwn: !!currentUserId && pub.id_usuario === currentUserId,
            nombre: pub.titulo,
            precio: Number(pub.precio) || 0,
            club: pub.club || "",
            categoria: mapCategoria(pub.categoria),
            coleccion: pub.coleccion || "Actual",
            stock: Number(pub.stock) || 0,
            img: primeraFoto || PLACEHOLDER,
          };
        });

        if (alive) setRows(mapped);
      } catch (e) {
        if (alive) setError(e.message || "No se pudieron cargar las publicaciones.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [currentUserId]);

  /* ===== Filtros ===== */
  const [sort, setSort] = useState("default");

  const [coleccion, setColeccion] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [equipo, setEquipo] = useState("Todos");

  useEffect(() => {
    if (!coleccion || coleccion === "Todas") {
      setCategoria("Todas");
      setEquipo("Todos");
    }
  }, [coleccion]);

  const hasColeccion = !!coleccion && coleccion !== "Todas";
  const hasCategoria = hasColeccion && categoria !== "Todas";

  const categorias = useMemo(() => {
    const base = hasColeccion ? rows.filter(p => p.coleccion === coleccion) : rows;
    const unique = Array.from(new Set(base.map((p) => p.categoria).filter(Boolean)));
    const allowed = ["Club", "Selección"];
    const filtered = unique.filter((c) => allowed.includes(c));
    return ["Todas", ...filtered];
  }, [rows, hasColeccion, coleccion]);

  const equipos = useMemo(() => {
    const baseColeccion = hasColeccion ? rows.filter(p => p.coleccion === coleccion) : rows;
    if (categoria === "Todas") {
      const list = Array.from(new Set(baseColeccion.map((p) => p.club).filter(Boolean)));
      return ["Todos", ...list];
    }
    const base = baseColeccion.filter((p) => p.categoria === categoria);
    const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
    return ["Todos", ...list];
  }, [rows, hasColeccion, coleccion, categoria]);

  // Precio máximo
  const [maxPrecio, setMaxPrecio] = useState(0);
  const maxPrecioAbsoluto = useMemo(() => {
    if (!rows.length) return 0;
    return Math.max(...rows.map((p) => Number(p.precio) || 0));
  }, [rows]);

  useEffect(() => {
    if (maxPrecioAbsoluto > 0) setMaxPrecio(maxPrecioAbsoluto);
  }, [maxPrecioAbsoluto]);

  const pct = maxPrecioAbsoluto
    ? Math.max(0, Math.min(100, (maxPrecio / maxPrecioAbsoluto) * 100))
    : 0;

  // Filtrado principal
  const productos = useMemo(() => {
    let list = rows.filter(
      (p) =>
        (coleccion === "" || coleccion === "Todas" || p.coleccion === coleccion) &&
        (categoria === "Todas" || p.categoria === categoria) &&
        (equipo === "Todos" || p.club === equipo) &&
        (Number(p.precio) || 0) <= (Number(maxPrecio) || 0)
    );

    switch (sort) {
      case "price-asc":
        list = list.slice().sort((a, b) => a.precio - b.precio);
        break;
      case "price-desc":
        list = list.slice().sort((a, b) => b.precio - a.precio);
        break;
      case "name":
        list = list.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      default:
        break;
    }
    return list;
  }, [rows, coleccion, categoria, equipo, maxPrecio, sort]);

  /* ===== Render ===== */
  return (
    <>
      <Header />

      {/* HERO */}
      <section className="hero">
        <div
          className={`hero-bg ${fading ? "is-fading" : ""}`}
          style={{ backgroundImage: `url(${HERO_IMGS[idx]})` }}
        />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <h1 className="hero-title">El mercado de las camisetas</h1>
          <p className="hero-subtitle">
            Publicá, comprá y vendé entre hinchas de verdad.
          </p>
        </div>
      </section>

      {/* CATÁLOGO */}
      <main className="container catalog">
        <div className="catalog-head">
          <h2 className="catalog-title">Catálogo</h2>
          {!loading && !error && (
            <p className="catalog-sub">Resultados: {productos.length}</p>
          )}
        </div>

        {/* TOOLBAR */}
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
              disabled={loading || !!error}
            >
              Restablecer
            </button>
          </div>
        </div>

        {/* ESTADOS */}
        {loading && <div className="empty">Cargando publicaciones…</div>}
        {error && !loading && <div className="empty" role="alert">{error}</div>}

        {/* GRILLA */}
        {!loading && !error && (
          productos.length === 0 ? (
            <div className="empty">No hay productos que coincidan con tus filtros.</div>
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