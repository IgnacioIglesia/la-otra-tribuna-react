// src/pages/Home/Home.js
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

        // 1) Excluir ofertas: permiso_oferta === true && 30+ días
        const filtered = (data || []).filter((pub) => {
          const enOferta =
            pub.permiso_oferta === true &&
            daysFrom(pub.fecha_publicacion) >= 30;
          return !enOferta;
        });

        // 2) Mapear a shape del Card (con imagen)
        const mapped = filtered.map((pub) => {
          const primeraFoto =
            pub.foto && pub.foto.length ? pub.foto[0].url : null;

          return {
            id: pub.id_publicacion,
            nombre: pub.titulo,
            precio: Number(pub.precio) || 0,
            club: pub.club || "",
            pais: "Uruguay",
            categoria: mapCategoria(pub.categoria),
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
  }, []);

  /* ===== Filtros + orden ===== */
  const [club, setClub] = useState("Todos");
  const [pais, setPais] = useState("Todos");
  const [categoria, setCategoria] = useState("Todas");
  const [maxPrecio, setMaxPrecio] = useState(0);
  const [sort, setSort] = useState("default");

  const maxPrecioAbsoluto = useMemo(() => {
    if (!rows.length) return 0;
    return Math.max(...rows.map((p) => Number(p.precio) || 0));
  }, [rows]);

  // inicializar slider cuando llegan datos
  useEffect(() => {
    if (maxPrecioAbsoluto > 0) setMaxPrecio(maxPrecioAbsoluto);
  }, [maxPrecioAbsoluto]);

  const clubs = useMemo(
    () => ["Todos", ...Array.from(new Set(rows.map((p) => p.club).filter(Boolean)))],
    [rows]
  );

  const paises = useMemo(
    () => ["Todos", ...Array.from(new Set(rows.map((p) => p.pais).filter(Boolean)))],
    [rows]
  );

  const categorias = useMemo(
    () => ["Todas", ...Array.from(new Set(rows.map((p) => p.categoria).filter(Boolean)))],
    [rows]
  );

  const productos = useMemo(() => {
    let list = rows.filter(
      (p) =>
        (club === "Todos" || p.club === club) &&
        (pais === "Todos" || p.pais === pais) &&
        (categoria === "Todas" || p.categoria === categoria) &&
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
  }, [rows, club, pais, categoria, maxPrecio, sort]);

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

      {/* ===== Catálogo ===== */}
      <main className="container catalog">
        <div className="catalog-head">
          <h2 className="catalog-title">Catálogo</h2>
          {!loading && !error && (
            <p className="catalog-sub">Resultados: {productos.length}</p>
          )}
        </div>

        {/* Controles */}
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
            <select
              value={club}
              onChange={(e) => setClub(e.target.value)}
              aria-label="Filtrar por club"
            >
              {clubs.map((c) => (
                <option key={c} value={c}>
                  {c === "Todos" ? "Todos los clubes" : c}
                </option>
              ))}
            </select>

            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              aria-label="Filtrar por país"
            >
              {paises.map((p) => (
                <option key={p} value={p}>
                  {p === "Todos" ? "Todos los países" : p}
                </option>
              ))}
            </select>

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

            <div className="price-filter">
              <label htmlFor="precio">
                Precio máx.: $
                {Number(maxPrecio || 0).toLocaleString("es-UY")}
              </label>
              <input
                id="precio"
                type="range"
                min="0"
                max={maxPrecioAbsoluto || 0}
                step="50"
                value={maxPrecio || 0}
                onChange={(e) => setMaxPrecio(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Estados */}
        {loading && <div className="empty">Cargando publicaciones…</div>}
        {error && !loading && (
          <div className="empty" role="alert">
            {error}
          </div>
        )}

        {/* Grid */}
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