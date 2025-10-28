import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import ProductGrid from "../../components/ProductGrid/ProductGrid";
import Dropdown from "../../components/Dropdown/Dropdown"; // ✅ nuevo
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

  /* ===== Control del dropdown abierto (para z-index del toolbar) ===== */
  const [anyDdOpen, setAnyDdOpen] = useState(false);

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
        .filter((p) => daysFrom(p.fecha_publicacion) >= 30)
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

  useEffect(() => {
    if (!coleccion || coleccion === "Todas") {
      setCategoria("Todas");
      setEquipo("Todos");
    }
  }, [coleccion]);

  const hasColeccion = !!coleccion && coleccion !== "Todas";
  const hasCategoria = hasColeccion && categoria !== "Todas";

  const categorias = useMemo(() => {
    const base = hasColeccion ? all.filter((p) => p.coleccion === coleccion) : all;
    const unique = Array.from(new Set(base.map((p) => p.categoria).filter(Boolean)));
    const allowed = ["Club", "Selección"];
    const filtered = unique.filter((c) => allowed.includes(c));
    return ["Todas", ...filtered];
  }, [all, hasColeccion, coleccion]);

  const equipos = useMemo(() => {
    const baseColeccion = hasColeccion ? all.filter((p) => p.coleccion === coleccion) : all;
    if (categoria === "Todas") {
      const list = Array.from(new Set(baseColeccion.map((p) => p.club).filter(Boolean)));
      return ["Todos", ...list];
    }
    const base = baseColeccion.filter((p) => p.categoria === categoria);
    const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
    return ["Todos", ...list];
  }, [all, hasColeccion, coleccion, categoria]);

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

      {/* HERO */}
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

      {/* CATÁLOGO */}
      <main className="container catalog">
        <div className="catalog-head">
          <h2 className="catalog-title">Ofertas disponibles</h2>
          {!loading && <p className="catalog-sub">Resultados: {productos.length}</p>}
        </div>

        {/* TOOLBAR con Dropdowns */}
        <div className={`filters-toolbar ${anyDdOpen ? "dd-open" : ""}`}>
          <div className="ft-left">
            {/* Ordenar */}
            <Dropdown
              icon="↕︎"
              value={sort}
              onChange={setSort}
              onOpenChange={setAnyDdOpen}
              options={[
                { value: "default", label: "Por defecto" },
                { value: "price-asc", label: "Precio: menor a mayor" },
                { value: "price-desc", label: "Precio: mayor a menor" },
                { value: "name", label: "Nombre (A–Z)" },
              ]}
            />

            {/* Colección */}
            <Dropdown
              icon="🗂️"
              placeholder="Elegí colección"
              value={coleccion || ""}
              onChange={setColeccion}
              onOpenChange={setAnyDdOpen}
              options={[
                { value: "", label: "Elegí colección" },
                { value: "Todas", label: "Todas" },
                { value: "Actual", label: "Actual" },
                { value: "Retro", label: "Retro" },
              ]}
            />

            {/* Categoría */}
            <Dropdown
              icon="🏷️"
              placeholder="Elegí categoría"
              value={hasColeccion ? categoria : ""}
              onChange={setCategoria}
              onOpenChange={setAnyDdOpen}
              disabled={!hasColeccion}
              options={[
                { value: "Todas", label: "Todas" },
                ...categorias.filter((c) => c !== "Todas").map((c) => ({ value: c, label: c })),
              ]}
            />

            {/* Equipo */}
            <Dropdown
              icon="⚽️"
              placeholder="Elegí equipo"
              value={hasCategoria ? equipo : ""}
              onChange={setEquipo}
              onOpenChange={setAnyDdOpen}
              disabled={!hasCategoria}
              align="right"
              options={
                (hasCategoria ? equipos : ["Elegí categoría"]).map((eq) =>
                  eq === "Elegí categoría"
                    ? { value: "", label: "Elegí categoría" }
                    : { value: eq, label: eq === "Todos" ? "Todos" : eq }
                )
              }
            />

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
                step="1"
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
                setAnyDdOpen(false);
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
        {!loading && (
          productos.length === 0 ? (
            <div className="empty">No hay productos en oferta que coincidan con tus filtros.</div>
          ) : (
            <ProductGrid products={productos} />
          )
        )}
      </main>
    </>
  );
}
