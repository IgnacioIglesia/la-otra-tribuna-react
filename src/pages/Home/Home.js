import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import ProductGrid from "../../components/ProductGrid/ProductGrid";
import Dropdown from "../../components/Dropdown/Dropdown";
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

/* ===== Talles ===== */
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Devuelve true si el producto tiene el talle seleccionado.
 *  Soporta strings como "M", "M/L", "S, M, L", etc. */
function matchesTalle(prodTalle, selected) {
  if (!selected || selected === "Todos") return true;
  const wanted = String(selected).toUpperCase().trim();
  const raw = String(prodTalle || "").toUpperCase();
  // Tokenizar por no-alfanuméricos (espacios, /, -, comas, etc.)
  const tokens = raw.split(/[^A-Z0-9]+/).filter(Boolean);
  return tokens.some((t) => t === wanted);
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  // recordar si se pidió catálogo
  const wantedCatalogOnMount = useRef(
    location.hash === "#catalogo" || location.state?.scrollTo === "catalogo"
  );
  useEffect(() => {
    if (location.hash === "#catalogo") wantedCatalogOnMount.current = true;
  }, [location.hash]);
  const showHero = !wantedCatalogOnMount.current;

  /* ===== Session ===== */
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
            id_publicacion, id_usuario, titulo, precio, categoria, coleccion,
            estado, permiso_oferta, fecha_publicacion, club, stock, talle,
            foto ( url, orden_foto )
          `)
          .eq("estado", "Activa")
          .gt("stock", 0)
          .order("id_publicacion", { ascending: false })
          .order("orden_foto", { foreignTable: "foto", ascending: true });

        if (error) throw error;

        const filtered = (data || []).filter((pub) => {
          const enOferta = pub.permiso_oferta === true && daysFrom(pub.fecha_publicacion) >= 30;
          return !enOferta;
        });

        const mapped = filtered.map((pub) => {
          const primeraFoto = Array.isArray(pub.foto) && pub.foto.length ? pub.foto[0].url : null;
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
            talle: pub.talle || "",          // <— lo usamos en el filtro por talle
          };
        });

        if (alive) setRows(mapped);
      } catch (e) {
        if (alive) setError(e.message || "No se pudieron cargar las publicaciones.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [currentUserId]);

  /* ===== Scroll suave al catálogo ===== */
  useEffect(() => {
    const wantsCatalog = location.hash === "#catalogo" || location.state?.scrollTo === "catalogo";
    if (!wantsCatalog || loading) return;

    const scrollToCatalog = () => {
      const el = document.getElementById("catalogo");
      if (!el) return false;
      const header = document.getElementById("siteHeader");
      const headerHeight = header?.getBoundingClientRect().height || 0;
      const y = el.getBoundingClientRect().top + window.pageYOffset - (headerHeight + 20);
      window.scrollTo({ top: y, behavior: "smooth" });
      return true;
    };

    if (location.state?.scrollTo) {
      navigate(location.pathname + location.hash, { replace: true, state: {} });
    }

    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const ok = scrollToCatalog();
          if (!ok) {
            let attempts = 0;
            const id = setInterval(() => {
              attempts++;
              if (scrollToCatalog() || attempts >= 30) clearInterval(id);
            }, 100);
          }
        });
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [loading, location.state, location.hash, location.pathname, navigate]);

  /* ===== Hero rotativo ===== */
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  useEffect(() => { HERO_IMGS.forEach((src) => { const i = new Image(); i.src = src; }); }, []);
  useEffect(() => {
    if (!showHero) return;
    const id = setInterval(() => { setPrevIdx(idx); setIdx((i) => (i + 1) % HERO_IMGS.length); }, 8000);
    return () => clearInterval(id);
  }, [idx, showHero]);
  const dirClass = (idx % 2 === 0) ? "dir-left" : "dir-right";

  /* ===== Filtros ===== */
  const [sort, setSort] = useState("default");
  const [coleccion, setColeccion] = useState("");   // "" => placeholder "Elegí colección"
  const [categoria, setCategoria] = useState("");   // "" => placeholder "Elegí categoría"
  const [equipo, setEquipo] = useState("Todos");
  const [talle, setTalle] = useState("");           // "" => placeholder "Elegí talle"

  // habilitación: equipo solo si se elige Club o Selección (no “Todos”)
  const hasCategoria = categoria === "Club" || categoria === "Selección";

  // categorías
  const categorias = useMemo(() => {
    const base = coleccion && coleccion !== "Todas"
      ? rows.filter((p) => p.coleccion === coleccion)
      : rows;
    const unique = Array.from(new Set(base.map((p) => p.categoria).filter(Boolean)));
    const allowed = ["Club", "Selección"];
    return unique.filter((c) => allowed.includes(c));
  }, [rows, coleccion]);

  // equipos
  const equipos = useMemo(() => {
    const baseColeccion = coleccion && coleccion !== "Todas"
      ? rows.filter((p) => p.coleccion === coleccion)
      : rows;

    if (!hasCategoria) {
      const list = Array.from(new Set(baseColeccion.map((p) => p.club).filter(Boolean)));
      return ["Todos", ...list];
    }
    const base = baseColeccion.filter((p) => p.categoria === categoria);
    const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
    return ["Todos", ...list];
  }, [rows, coleccion, categoria, hasCategoria]);

  // precio
  const [maxPrecio, setMaxPrecio] = useState(0);
  const maxPrecioAbsoluto = useMemo(() => {
    if (!rows.length) return 0;
    return Math.max(...rows.map((p) => Number(p.precio) || 0));
  }, [rows]);
  useEffect(() => { if (maxPrecioAbsoluto > 0) setMaxPrecio(maxPrecioAbsoluto); }, [maxPrecioAbsoluto]);
  const pct = maxPrecioAbsoluto ? Math.max(0, Math.min(100, (maxPrecio / maxPrecioAbsoluto) * 100)) : 0;

  // aplicar filtros
  const productos = useMemo(() => {
    let list = rows.filter(
      (p) =>
        (coleccion === "" || coleccion === "Todas" || p.coleccion === coleccion) &&
        (categoria === "" || categoria === "Todos" || p.categoria === categoria) &&
        (equipo === "Todos" || p.club === equipo) &&
        matchesTalle(p.talle, talle) &&
        (Number(p.precio) || 0) <= (Number(maxPrecio) || 0)
    );

    switch (sort) {
      case "price-asc":  list = list.slice().sort((a, b) => a.precio - b.precio); break;
      case "price-desc": list = list.slice().sort((a, b) => b.precio - a.precio); break;
      case "name":       list = list.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)); break;
      default: break;
    }
    return list;
  }, [rows, coleccion, categoria, equipo, talle, maxPrecio, sort]);

  /* ===== Control overlay de dropdowns ===== */
  const [anyDdOpen, setAnyDdOpen] = useState(false);

  /* ===== Render ===== */
  return (
    <>
      <Header />

      {/* HERO */}
      {showHero && (
        <section className="hero">
          {prevIdx !== null && <div className="hero-bg prev" style={{ backgroundImage: `url(${HERO_IMGS[prevIdx]})` }} />}
          <div className={`hero-bg active ${dirClass}`} key={idx} style={{ backgroundImage: `url(${HERO_IMGS[idx]})` }} />
          <div className="hero-overlay" />
          <div className="container hero-content">
            <h1 className="hero-title">El mercado de las camisetas</h1>
            <p className="hero-subtitle">Publicá, comprá y vendé entre hinchas de verdad.</p>
          </div>
        </section>
      )}

      {/* CATÁLOGO */}
      <main id="catalogo" className="container catalog">
        <div className="catalog-head">
          <h2 className="catalog-title">Catálogo</h2>
          {!loading && !error && <p className="catalog-sub">Resultados: {productos.length}</p>}
        </div>

        {/* TOOLBAR */}
        <div className={`filters-toolbar ${anyDdOpen ? "dd-open" : ""}`}>
          <div className="ft-left">
            {/* Ordenar */}
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

            {/* Colección */}
            <Dropdown
              icon="↕︎"
              placeholder="Elegí colección"
              value={coleccion}
              onChange={(v) => setColeccion(v)}     // "Todas" = sin filtro
              onOpenChange={setAnyDdOpen}
              options={[
                { value: "Todas",  label: "Todas" },
                { value: "Actual", label: "Actual" },
                { value: "Retro",  label: "Retro" },
              ]}
            />

            {/* Categoría */}
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

            {/* Equipo */}
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

            {/* Talle */}
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
                setCategoria("");
                setEquipo("Todos");
                setTalle("");
                setMaxPrecio(maxPrecioAbsoluto || 0);
                setAnyDdOpen(false);
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
          productos.length === 0
            ? <div className="empty">No hay productos que coincidan con tus filtros.</div>
            : <ProductGrid products={productos} />
        )}
      </main>
    </>
  );
}
