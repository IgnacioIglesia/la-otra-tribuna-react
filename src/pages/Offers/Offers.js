import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import ProductGrid from "../../components/ProductGrid/ProductGrid";
import Dropdown from "../../components/Dropdown/Dropdown";
import { supabase } from "../../lib/supabaseClient";
import "./Offers.css";

/* ===== Constantes/Utils ===== */
const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

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
/** Devuelve true si el producto tiene el talle seleccionado. */
function matchesTalle(prodTalle, selected) {
  if (!selected || selected === "Todos") return true;
  const wanted = String(selected).toUpperCase().trim();
  const raw = String(prodTalle || "").toUpperCase();
  const tokens = raw.split(/[^A-Z0-9]+/).filter(Boolean);
  return tokens.some((t) => t === wanted);
}

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  /* ===== Filtros (mismos que Home) ===== */
  const [sort, setSort] = useState("default");
  const [coleccion, setColeccion] = useState("");   // "" => placeholder
  const [categoria, setCategoria] = useState("");   // "" => placeholder
  const [equipo, setEquipo] = useState("Todos");
  const [talle, setTalle] = useState("");           // "" => placeholder
  const [maxPrecio, setMaxPrecio] = useState(0);
  const [anyDdOpen, setAnyDdOpen] = useState(false);

  /* ===== Carga de datos (solo ofertas) ===== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("publicacion")
          .select(`
            id_publicacion, id_usuario, titulo, precio, precio_oferta,
            categoria, coleccion, estado, permiso_oferta, fecha_publicacion,
            club, stock, talle,
            foto ( url, orden_foto )
          `)
          .eq("estado", "Activa")
          .eq("permiso_oferta", true)
          .gt("stock", 0)
          .order("id_publicacion", { ascending: false })
          .order("orden_foto", { foreignTable: "foto", ascending: true });

        if (error) throw error;

        const mapped = (data || [])
          .filter((p) => daysFrom(p.fecha_publicacion) >= 30)
          .map((pub) => {
            const primeraFoto =
              (Array.isArray(pub.foto) && pub.foto.length && pub.foto[0].url) || PLACEHOLDER;
            const base = Number(pub.precio) || 0;
            const offer = pub.precio_oferta != null ? Number(pub.precio_oferta) : Math.round(base * 0.9);

            return {
              id: pub.id_publicacion,
              nombre: pub.titulo,
              club: pub.club || "",
              categoria: mapCategoria(pub.categoria),
              coleccion: pub.coleccion || "Actual",
              stock: Number(pub.stock) || 0,
              img: primeraFoto,
              talle: pub.talle || "",
              // precios (ProductGrid puede usar estos campos)
              isOffer: true,
              precio: base,
              precioAnterior: base,
              precio_oferta: offer,
            };
          });

        setRows(mapped);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===== Derivados para dropdowns ===== */
  const hasCategoria = categoria === "Club" || categoria === "Selección";

  // Categorías disponibles según colección (igual a Home)
  const categorias = useMemo(() => {
    const base = coleccion && coleccion !== "Todas" ? rows.filter((p) => p.coleccion === coleccion) : rows;
    const unique = Array.from(new Set(base.map((p) => p.categoria).filter(Boolean)));
    const allowed = ["Club", "Selección"];
    return unique.filter((c) => allowed.includes(c));
  }, [rows, coleccion]);

  // Equipos según colección y categoría (igual a Home)
  const equipos = useMemo(() => {
    const baseColeccion = coleccion && coleccion !== "Todas" ? rows.filter((p) => p.coleccion === coleccion) : rows;
    if (!hasCategoria) {
      const list = Array.from(new Set(baseColeccion.map((p) => p.club).filter(Boolean)));
      return ["Todos", ...list];
    }
    const base = baseColeccion.filter((p) => p.categoria === categoria);
    const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
    return ["Todos", ...list];
  }, [rows, coleccion, categoria, hasCategoria]);

  // Precio máx: tomamos el precio de oferta si existe (más intuitivo en Ofertas)
  const maxPrecioAbsoluto = useMemo(() => {
    if (!rows.length) return 0;
    return Math.max(...rows.map((p) => Number(p.precio_oferta ?? p.precio) || 0));
  }, [rows]);

  useEffect(() => { if (maxPrecioAbsoluto > 0) setMaxPrecio(maxPrecioAbsoluto); }, [maxPrecioAbsoluto]);
  const pct = maxPrecioAbsoluto ? Math.max(0, Math.min(100, (maxPrecio / maxPrecioAbsoluto) * 100)) : 0;

  /* ===== Aplicar filtros y orden ===== */
  const productos = useMemo(() => {
    let list = rows.filter(
      (p) =>
        (coleccion === "" || coleccion === "Todas" || p.coleccion === coleccion) &&
        (categoria === "" || categoria === "Todos" || p.categoria === categoria) &&
        (equipo === "Todos" || p.club === equipo) &&
        matchesTalle(p.talle, talle) &&
        (Number(p.precio_oferta ?? p.precio) || 0) <= (Number(maxPrecio) || 0)
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
  }, [rows, coleccion, categoria, equipo, talle, maxPrecio, sort]);

  return (
    <>
      <Header />

      {/* HERO simple de ofertas */}
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
          <h2 className="hero-subtitle">Ofertas</h2>
          <p className="hero-desc">Aprovechá descuentos por tiempo limitado.</p>
        </div>
      </section>

      {/* LISTADO */}
      <main className="container catalog">
        <div className="catalog-head">
          <h2 className="catalog-title">Ofertas disponibles</h2>
          {!loading && <p className="catalog-sub">Resultados: {productos.length}</p>}
        </div>

        {/* TOOLBAR — idéntica a Home (una sola línea: pills | slider | reset) */}
        <div className={`filters-toolbar ${anyDdOpen ? "dd-open" : ""}`}>
          <div className="ft-inline">
            {/* Pills */}
            <div className="ft-pills">
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

              <Dropdown
                icon="↕︎"
                placeholder="Elegí colección"
                value={coleccion}
                onChange={setColeccion}
                onOpenChange={setAnyDdOpen}
                options={[
                  { value: "Todas", label: "Todas" },
                  { value: "Actual", label: "Actual" },
                  { value: "Retro", label: "Retro" },
                ]}
              />

              <Dropdown
                icon="↕︎"
                placeholder="Elegí categoría"
                value={categoria}
                onChange={(v) => { setCategoria(v); setEquipo("Todos"); }}
                onOpenChange={setAnyDdOpen}
                options={[
                  { value: "Todos", label: "Todos" },
                  ...categorias.map((c) => ({ value: c, label: c })),
                ]}
              />

              <Dropdown
                icon="↕︎"
                placeholder="Todos"
                value={hasCategoria ? equipo : "Todos"}
                onChange={setEquipo}
                onOpenChange={setAnyDdOpen}
                disabled={!hasCategoria}
                options={
                  (hasCategoria ? equipos : ["Todos"]).map((eq) =>
                    typeof eq === "string"
                      ? { value: eq, label: eq }
                      : { value: eq, label: eq === "Todos" ? "Todos" : eq }
                  )
                }
                align="right"
              />

              <Dropdown
                icon="↕︎"
                placeholder="Elegí talle"
                value={talle}
                onChange={setTalle}
                onOpenChange={setAnyDdOpen}
                options={[
                  { value: "Todos", label: "Todos" },
                  ...SIZES.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>

            {/* Slider que se estira */}
            <div className="ft-price-inline" style={{ "--pct": `${pct}%` }}>
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
                aria-label="Precio máximo"
              />
            </div>

            {/* Reset a la derecha */}
            <button
              className="ft-reset"
              type="button"
              onClick={() => {
                setSort("default");
                setColeccion("");
                setCategoria("");
                setEquipo("Todos");
                setTalle("");
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

        {/* ESTADOS + GRILLA */}
        {loading && <div className="empty">Cargando ofertas…</div>}
        {!loading && (
          productos.length === 0
            ? <div className="empty">No hay productos en oferta que coincidan con tus filtros.</div>
            : <ProductGrid products={productos} />
        )}
      </main>
    </>
  );
}
