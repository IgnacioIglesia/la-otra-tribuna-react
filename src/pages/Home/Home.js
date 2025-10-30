import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import ProductGrid from "../../components/ProductGrid/ProductGrid";
import Dropdown from "../../components/Dropdown/Dropdown";
import { supabase } from "../../lib/supabaseClient";
import "./Home.css";
import { useFilters } from "../../context/FiltersContext"; // 👈 NUEVO

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

/** Devuelve true si el producto tiene el talle seleccionado. */
function matchesTalle(prodTalle, selected) {
  if (!selected || selected === "Todos") return true;
  const wanted = String(selected).toUpperCase().trim();
  const raw = String(prodTalle || "").toUpperCase();
  const tokens = raw.split(/[^A-Z0-9]+/).filter(Boolean);
  return tokens.some((t) => t === wanted);
}

export default function Home() {
  const { homeFilters, setHomeFilters } = useFilters(); // 👈 NUEVO
  const location = useLocation();
  const navigate = useNavigate();

  // Al montar, si venís con #catalogo o state, ocultá hero; si no, mostralo
  const [showHero, setShowHero] = useState(
    !(location.hash === "#catalogo" || location.state?.scrollTo === "catalogo")
  );
  // Cada vez que cambia el hash/state, recalculá
  useEffect(() => {
   setShowHero(!(location.hash === "#catalogo" || location.state?.scrollTo === "catalogo"));
  }, [location.hash, location.state]);

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
            estado, permiso_oferta, fecha_publicacion, club, stock, talle, moneda,
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
            moneda: pub.moneda || "USD",
            club: pub.club || "",
            categoria: mapCategoria(pub.categoria),
            coleccion: pub.coleccion || "Actual",
            stock: Number(pub.stock) || 0,
            img: primeraFoto || PLACEHOLDER,
            talle: pub.talle || "",
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
  const [moneda, setMoneda] = useState("");         // "" => Todas
  const [coleccion, setColeccion] = useState("");   // "" => Todas
  const [categoria, setCategoria] = useState("");   // "" => Todas
  const [equipo, setEquipo] = useState("Todos");
  const [talle, setTalle] = useState("");           // "" => Todos

  // ✅ Detectar si hay mezcla de monedas
  const hayMezclaMonedas = useMemo(() => {
    if (moneda) return false; // Si ya filtró por moneda, no hay mezcla
    const monedasUnicas = new Set(rows.map(p => p.moneda));
    return monedasUnicas.size > 1;
  }, [rows, moneda]);

  const hasCategoria = categoria === "Club" || categoria === "Selección";

  // categorías disponibles según colección y moneda
  const categorias = useMemo(() => {
    let base = rows;
    if (moneda) base = base.filter((p) => p.moneda === moneda);
    if (coleccion && coleccion !== "Todas") base = base.filter((p) => p.coleccion === coleccion);
    
    const unique = Array.from(new Set(base.map((p) => p.categoria).filter(Boolean)));
    const allowed = ["Club", "Selección"];
    return unique.filter((c) => allowed.includes(c));
  }, [rows, coleccion, moneda]);

  // equipos (depende de moneda, colección y categoría)
  const equipos = useMemo(() => {
    let base = rows;
    if (moneda) base = base.filter((p) => p.moneda === moneda);
    if (coleccion && coleccion !== "Todas") base = base.filter((p) => p.coleccion === coleccion);

    if (!hasCategoria) {
      const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
      return ["Todos", ...list];
    }
    base = base.filter((p) => p.categoria === categoria);
    const list = Array.from(new Set(base.map((p) => p.club).filter(Boolean)));
    return ["Todos", ...list];
  }, [rows, moneda, coleccion, categoria, hasCategoria]);

  // precio máximo según moneda seleccionada
  const [maxPrecio, setMaxPrecio] = useState(0);
  const maxPrecioAbsoluto = useMemo(() => {
    const base = moneda ? rows.filter((p) => p.moneda === moneda) : rows;
    if (!base.length) return 0;
    const max = Math.max(...base.map((p) => Number(p.precio) || 0));
    return max + 1; // ✅ Agregar 1 para incluir el producto más caro
  }, [rows, moneda]);
  
  useEffect(() => { 
    if (maxPrecioAbsoluto > 0) setMaxPrecio(maxPrecioAbsoluto); 
  }, [maxPrecioAbsoluto]);
  
  const pct = maxPrecioAbsoluto ? Math.max(0, Math.min(100, (maxPrecio / maxPrecioAbsoluto) * 100)) : 0;

  // aplicar filtros
  const productos = useMemo(() => {
    let list = rows.filter(
      (p) =>
        (moneda === "" || p.moneda === moneda) &&
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
  }, [rows, moneda, coleccion, categoria, equipo, talle, maxPrecio, sort]);

  const [anyDdOpen, setAnyDdOpen] = useState(false);

  const resetFilters = () => {
    setSort("default");
    setMoneda("");
    setColeccion("");
    setCategoria("");
    setEquipo("Todos");
    setTalle("");
    const newMax = rows.length ? Math.max(...rows.map((p) => Number(p.precio) || 0)) + 1 : 0;
    setMaxPrecio(newMax);
    setAnyDdOpen(false);
  };

  /* ===== Persistencia de filtros (rehidratar/guardar) ===== */
  // Rehidratar una sola vez al montar (si hay snapshot previo)
  useEffect(() => {
    if (!homeFilters) return;
    const {
      sort: _sort,
      moneda: _moneda,
      coleccion: _coleccion,
      categoria: _categoria,
      equipo: _equipo,
      talle: _talle,
      maxPrecio: _maxPrecio
    } = homeFilters;

    if (_sort !== undefined) setSort(_sort);
    if (_moneda !== undefined) setMoneda(_moneda);
    if (_coleccion !== undefined) setColeccion(_coleccion);
    if (_categoria !== undefined) setCategoria(_categoria);
    if (_equipo !== undefined) setEquipo(_equipo);
    if (_talle !== undefined) setTalle(_talle);
    if (_maxPrecio !== undefined) setMaxPrecio(_maxPrecio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 👈 solo al montar

  // Guardar snapshot cada vez que cambie algún filtro
  useEffect(() => {
    setHomeFilters({
      sort, moneda, coleccion, categoria, equipo, talle, maxPrecio
    });
  }, [sort, moneda, coleccion, categoria, equipo, talle, maxPrecio, setHomeFilters]);

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

        {/* FILTROS EN DOS LÍNEAS */}
        <div className={`filters-toolbar-v2 ${anyDdOpen ? "dd-open" : ""}`}>
          {/* PRIMERA LÍNEA: Ordenamiento y Filtros principales */}
          <div className="filter-row filter-row--main">
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
              icon="↕︎"
              placeholder="Elegí moneda"
              value={moneda}
              onChange={(v) => {
                setMoneda(v);
                // Resetear precio cuando cambia moneda
                const newBase = v ? rows.filter((p) => p.moneda === v) : rows;
                const newMax = newBase.length ? Math.max(...newBase.map((p) => Number(p.precio) || 0)) + 1 : 0;
                setMaxPrecio(newMax);
              }}
              onOpenChange={setAnyDdOpen}
              options={[
                { value: "",    label: "Todas" },
                { value: "USD", label: "USD" },
                { value: "UYU", label: "UYU" },
              ]}
            />
            
            <Dropdown
              icon="↕︎"
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
              icon="↕︎"
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

          {/* SEGUNDA LÍNEA: Precio y Reset */}
          <div className="filter-row filter-row--secondary">
            <div className="price-filter" style={{ "--pct": `${pct}%` }}>
              <label className="price-label">
                Precio máx.: 
                <span className="price-value">
                  {moneda === "USD" ? "U$D" : moneda === "UYU" ? "$" : "$"}
                  {" "}{Number(maxPrecio || 0).toLocaleString("es-UY")}
                </span>
              </label>
              <input
                type="range"
                className="price-slider"
                min="0"
                max={maxPrecioAbsoluto || 0}
                step="1"
                value={maxPrecio || 0}
                onChange={(e) => setMaxPrecio(Number(e.target.value))}
                aria-label="Precio máximo"
              />
            </div>

            <button
              className="btn-reset-filters"
              type="button"
              onClick={resetFilters}
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