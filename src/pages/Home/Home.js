import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import ProductCard from "../../components/ProductCard/ProductCard";
import { supabase } from "../../lib/supabaseClient";
import "./Home.css";

/* ===== Util ===== */
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

/* Imágenes del hero (en /public/assets/) */
const HERO_IMGS = [
  "/assets/fondo1.png",
  "/assets/fondo2.png",
  "/assets/fondo3.png",
  "/assets/fondo4.png",
];

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
          .select("*, foto (url, orden_foto)")
          .eq("estado", "Activa")
          .order("id_publicacion", { ascending: false });

        if (error) throw error;

        // Excluir ofertas viejas
        const filtered = (data || []).filter((pub) => {
          const enOferta =
            pub.permiso_oferta === true &&
            daysFrom(pub.fecha_publicacion) >= 30;
          return !enOferta;
        });

        // Mapear a formato para el card
        const mapped = filtered.map((pub) => {
          const primeraFoto =
            pub.foto && pub.foto.length ? pub.foto[0].url : null;

          return {
            id: pub.id_publicacion,
            nombre: pub.titulo,
            precio: Number(pub.precio) || 0,
            club: pub.club || "",
            categoria: mapCategoria(pub.categoria),
            img: primeraFoto || PLACEHOLDER,
          };
        });

        if (alive) setRows(mapped);
      } catch (e) {
        if (alive)
          setError(e.message || "No se pudieron cargar las publicaciones.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ===== Filtros + orden ===== */
  const [sort, setSort] = useState("default");
  const [categoria, setCategoria] = useState("Todas");
  const [equipo, setEquipo] = useState("Todos");
  const [maxPrecio, setMaxPrecio] = useState(0);

  // Máximo absoluto para slider
  const maxPrecioAbsoluto = useMemo(() => {
    if (!rows.length) return 0;
    return Math.max(...rows.map((p) => Number(p.precio) || 0));
  }, [rows]);

  // Inicializa slider cuando llegan datos
  useEffect(() => {
    if (maxPrecioAbsoluto > 0) setMaxPrecio(maxPrecioAbsoluto);
  }, [maxPrecioAbsoluto]);

  // Categorías disponibles
  const categorias = useMemo(
    () => [
      "Todas",
      ...Array.from(new Set(rows.map((p) => p.categoria).filter(Boolean))),
    ],
    [rows]
  );

  // Equipos según categoría elegida
  const equipos = useMemo(() => {
    const base =
      categoria === "Todas"
        ? []
        : rows.filter((p) => p.categoria === categoria);
    const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
    return ["Todos", ...list];
  }, [rows, categoria]);

  // Reset equipo si cambia categoría
  useEffect(() => {
    if (!equipos.includes(equipo)) setEquipo("Todos");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, equipos.join("|")]);

  // Filtrado de productos
  const productos = useMemo(() => {
    let list = rows.filter(
      (p) =>
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
  }, [rows, categoria, equipo, maxPrecio, sort]);

  // % del slider para el relleno verde
  const pct = maxPrecioAbsoluto
    ? Math.max(0, Math.min(100, (maxPrecio / maxPrecioAbsoluto) * 100))
    : 0;

  /* ===== Render ===== */
  return (
    <>
      <Header />

      {/* ===== HERO ===== */}
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

      {/* ===== CATÁLOGO ===== */}
      <main className="container catalog">
        <div className="catalog-head">
          <h2 className="catalog-title">Catálogo</h2>
          {!loading && !error && (
            <p className="catalog-sub">Resultados: {productos.length}</p>
          )}
        </div>

        {/* ===== CONTROLES ===== */}
        <div className="controls">
          <div className="control">
            <label htmlFor="orden">Ordenar por:</label>
            <select
              id="orden"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="default">Por defecto</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name">Nombre (A–Z)</option>
            </select>
          </div>

          <div className="filters-row">
            {/* Categoría */}
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label="Filtrar por categoría"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "Todas" ? "Todas las categorías" : cat}
                </option>
              ))}
            </select>

            {/* Equipo / Club / Selección (bloqueado si no hay categoría) */}
            <select
              value={categoria === "Todas" ? "" : equipo}
              onChange={(e) => setEquipo(e.target.value)}
              aria-label="Filtrar por equipo"
              disabled={categoria === "Todas"}
            >
              {categoria === "Todas" ? (
                <option value="" disabled>
                  Elegí una categoría primero
                </option>
              ) : (
                equipos.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq === "Todos" ? "Todos los equipos" : eq}
                  </option>
                ))
              )}
            </select>

            {/* Precio máx con barra funcional */}
            <div className="price-filter">
              <label htmlFor="precio">
                Precio máx.: ${Number(maxPrecio || 0).toLocaleString("es-UY")}
              </label>
              <input
                id="precio"
                type="range"
                min="0"
                max={maxPrecioAbsoluto || 0}
                step="50"
                value={maxPrecio || 0}
                onChange={(e) => setMaxPrecio(Number(e.target.value))}
                style={{ "--pct": `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ===== ESTADOS ===== */}
        {loading && <div className="empty">Cargando publicaciones…</div>}
        {error && !loading && (
          <div className="empty" role="alert">
            {error}
          </div>
        )}

        {/* ===== GRILLA ===== */}
        {!loading && !error && (
          <>
            {productos.length === 0 ? (
              <div className="empty">
                No hay productos que coincidan con tus filtros.
              </div>
            ) : (
              <section className="products-grid">
                {productos.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}