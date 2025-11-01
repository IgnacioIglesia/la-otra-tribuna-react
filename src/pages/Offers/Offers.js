import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import ProductGrid from "../../components/ProductGrid/ProductGrid";
import Dropdown from "../../components/Dropdown/Dropdown";
import { supabase } from "../../lib/supabaseClient";
import "./Offers.css";
import { useFilters } from "../../context/FiltersContext";

const PLACEHOLDER = "https://placehold.co/600x750?text=Camiseta";

/* ===== Utils ===== */
function daysFrom(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/* ===== Talles ===== */
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Devuelve true si el producto tiene el talle seleccionado. */
function matchesTalle(prodTalle, selected) {
  if (!selected || selected === "Todos") return true;
  const wanted = String(selected).toUpperCase().trim();
  const raw = String(prodTalle || "").toUpperCase();
  const tokens = raw.split(/[^A-Z0-9]+/).filter(Boolean);
  return tokens.some((t) => t === wanted);
}

function mapCategoria(cat) {
  if (!cat) return "Club";
  return cat === "Seleccion" ? "Selección" : cat;
}

export default function Offers() {
  const { offersFilters, setOffersFilters } = useFilters();

  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [error, setError] = useState("");

  /* ===== Filtros (SIN precio) ===== */
  const [sort, setSort] = useState("default");
  const [moneda, setMoneda] = useState("");
  const [coleccion, setColeccion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [equipo, setEquipo] = useState("Todos");
  const [talle, setTalle] = useState("");

  const [anyDdOpen, setAnyDdOpen] = useState(false);

  /* ===== Data ===== */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data, error } = await supabase
          .from("publicacion")
          .select(`
            id_publicacion,
            id_usuario,
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
            talle,
            moneda,
            foto ( url, orden_foto )
          `)
          .eq("estado", "Activa")
          .eq("permiso_oferta", true)
          .gt("stock", 0)
          .order("id_publicacion", { ascending: false })
          .order("orden_foto", { foreignTable: "foto", ascending: true });

        if (error) throw error;

        // Solo ofertas válidas (>= 30 días)
        const mapped = (data || [])
          .filter((p) => daysFrom(p.fecha_publicacion) >= 30)
          .map((pub) => {
            const foto = pub.foto?.[0]?.url || PLACEHOLDER;
            const basePrice = Number(pub.precio) || 0;
            const offerPrice =
              pub.precio_oferta != null
                ? Number(pub.precio_oferta)
                : Math.round(basePrice * 0.9);

            return {
              id: pub.id_publicacion,
              ownerId: pub.id_usuario,
              nombre: pub.titulo,
              club: pub.club || "",
              categoria: mapCategoria(pub.categoria),
              coleccion: pub.coleccion || "Actual",
              img: foto,
              stock: Number(pub.stock) || 0,
              talle: pub.talle || "",
              moneda: pub.moneda || "USD",
              isOffer: true,
              precioAnterior: basePrice,
              precio_oferta: offerPrice,
              precio: offerPrice,
            };
          });

        setAll(mapped);
      } catch (e) {
        setError(e.message || "No se pudieron cargar las ofertas.");
        setAll([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Estados derivados
  const hasCategoria = categoria === "Club" || categoria === "Selección";

  const categorias = useMemo(() => {
    let base = all;
    if (moneda) base = base.filter((p) => p.moneda === moneda);
    if (coleccion && coleccion !== "Todas") base = base.filter((p) => p.coleccion === coleccion);

    const unique = Array.from(new Set(base.map((p) => p.categoria).filter(Boolean)));
    const allowed = ["Club", "Selección"];
    return unique.filter((c) => allowed.includes(c));
  }, [all, coleccion, moneda]);

  const equipos = useMemo(() => {
    let base = all;
    if (moneda) base = base.filter((p) => p.moneda === moneda);
    if (coleccion && coleccion !== "Todas") base = base.filter((p) => p.coleccion === coleccion);

    if (!hasCategoria) {
      const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
      return ["Todos", ...list];
    }
    base = base.filter((p) => p.categoria === categoria);
    const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
    return ["Todos", ...list];
  }, [all, moneda, coleccion, categoria, hasCategoria]);

  const productos = useMemo(() => {
    let list = all.filter(
      (p) =>
        (coleccion === "" || coleccion === "Todas" || p.coleccion === coleccion) &&
        (categoria === "" || categoria === "Todos" || p.categoria === categoria) &&
        (equipo === "Todos" || p.club === equipo) &&
        (moneda === "" || p.moneda === moneda) &&
        matchesTalle(p.talle, talle)
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
  }, [all, coleccion, categoria, equipo, talle, sort, moneda]);

  const resetFilters = () => {
    setSort("default");
    setMoneda("");
    setColeccion("");
    setCategoria("");
    setEquipo("Todos");
    setTalle("");
    setAnyDdOpen(false);
  };

  /* ===== Persistencia de filtros ===== */
  useEffect(() => {
    if (!offersFilters) return;
    const {
      sort: _sort,
      moneda: _moneda,
      coleccion: _coleccion,
      categoria: _categoria,
      equipo: _equipo,
      talle: _talle
    } = offersFilters;

    if (_sort !== undefined) setSort(_sort);
    if (_moneda !== undefined) setMoneda(_moneda);
    if (_coleccion !== undefined) setColeccion(_coleccion);
    if (_categoria !== undefined) setCategoria(_categoria);
    if (_equipo !== undefined) setEquipo(_equipo);
    if (_talle !== undefined) setTalle(_talle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOffersFilters({
      sort, moneda, coleccion, categoria, equipo, talle
    });
  }, [sort, moneda, coleccion, categoria, equipo, talle, setOffersFilters]);

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
          {!loading && !error && <p className="catalog-sub">Resultados: {productos.length}</p>}
          {error && <p className="catalog-sub" role="alert">{error}</p>}
        </div>

        {/* FILTROS EN UNA LÍNEA */}
        <div className={`filters-toolbar ${anyDdOpen ? "dd-open" : ""}`}>
          <div className="filters-single-row">
            <Dropdown
              icon="↕︎"
              value={sort}
              onChange={setSort}
              onOpenChange={setAnyDdOpen}
              options={[
                { value: "default",    label: "Por defecto" },
                { value: "price-asc",  label: "Precio: menor a mayor" },
                { value: "price-desc", label: "Precio: mayor a menor" },
                { value: "name",       label: "Nombre (A–Z)" },
              ]}
            />

            <Dropdown
              icon="↕"
              placeholder="Elegí moneda"
              value={moneda}
              onChange={(v) => {
                const sel = v === "ALL" ? "" : v;
                setMoneda(sel);
              }}
              onOpenChange={setAnyDdOpen}
              options={[
                { value: "ALL", label: "Todas" },
                { value: "USD", label: "USD" },
                { value: "UYU", label: "UYU" },
              ]}
            />

            <Dropdown
              icon="↕"
              placeholder="Elegí colección"
              value={coleccion}
              onChange={setColeccion}
              onOpenChange={setAnyDdOpen}
              options={[
                { value: "Todas",  label: "Todas" },
                { value: "Actual", label: "Actual" },
                { value: "Retro",  label: "Retro" },
              ]}
            />

            <Dropdown
              icon="↕"
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
              icon="↕"
              placeholder="Elegí equipo"
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
            />

            <Dropdown
              icon="↕"
              placeholder="Elegí talle"
              value={talle}
              onChange={setTalle}
              onOpenChange={setAnyDdOpen}
              options={[
                { value: "Todos", label: "Todos" },
                ...SIZES.map((s) => ({ value: s, label: s })),
              ]}
            />

            <button
              className="btn-reset-filters"
              type="button"
              onClick={resetFilters}
              title="Restablecer filtros"
              disabled={loading || !!error}
            >
              🔄 Restablecer
            </button>
          </div>
        </div>

        {/* ESTADOS */}
        {loading && <div className="empty">Cargando ofertas…</div>}
        {error && !loading && <div className="empty" role="alert">{error}</div>}

        {/* GRILLA */}
        {!loading && !error && (
          productos.length === 0
            ? <div className="empty">No hay productos en oferta que coincidan con tus filtros.</div>
            : <ProductGrid products={productos} />
        )}
      </main>
    </>
  );
}