import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import ProductGrid from "../../components/ProductGrid/ProductGrid";
import Dropdown from "../../components/Dropdown/Dropdown";
import { supabase } from "../../lib/supabaseClient";
import "./Home.css";
import { useFilters } from "../../context/FiltersContext";

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
const HERO_IMGS = ["/assets/fondo2.png", "/assets/fondo3.png", "/assets/fondo7.png", "/assets/fondo9.png", "/assets/fondo10.png", "/assets/fondo11.png", "/assets/fondo12.png"];

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
  const { homeFilters, setHomeFilters } = useFilters();
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Determinar si debe mostrarse el hero SOLO al inicio
  const wantsCatalog = location.hash === "#catalogo" || location.state?.scrollTo === "catalogo";
  const [showHero, setShowHero] = useState(!wantsCatalog);
  
  // ✅ Referencia para saber si ya se scrolleó
  const hasScrolledRef = useRef(false);

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

  /* ===== Scroll suave al catálogo - MEJORADO ===== */
  useEffect(() => {
    // Si no quiere ir al catálogo o ya scrolleamos, no hacer nada
    if (!wantsCatalog || hasScrolledRef.current) return;
    
    // Esperar a que termine de cargar
    if (loading) return;

    const scrollToCatalog = () => {
      const el = document.getElementById("catalogo");
      if (!el) return false;
      
      const header = document.getElementById("siteHeader");
      const headerHeight = header?.getBoundingClientRect().height || 0;
      const y = el.getBoundingClientRect().top + window.pageYOffset - (headerHeight + 20);
      
      window.scrollTo({ top: y, behavior: "smooth" });
      return true;
    };

    // Limpiar el state si viene de navigate
    if (location.state?.scrollTo) {
      navigate(location.pathname + location.hash, { replace: true, state: {} });
    }

    // Intentar scrollear después de que el DOM se estabilice
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const success = scrollToCatalog();
          
          if (success) {
            hasScrolledRef.current = true;
          } else {
            // Reintentar si no se encontró el elemento
            let attempts = 0;
            const intervalId = setInterval(() => {
              attempts++;
              if (scrollToCatalog() || attempts >= 20) {
                clearInterval(intervalId);
                hasScrolledRef.current = true;
              }
            }, 100);
          }
        });
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [loading, wantsCatalog, location.state, location.hash, location.pathname, navigate]);

  // ✅ Resetear hasScrolledRef cuando cambia la ubicación
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [location.pathname, location.hash]);

  /* ===== Hero rotativo ===== */
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  
  useEffect(() => { 
    HERO_IMGS.forEach((src) => { 
      const i = new Image(); 
      i.src = src; 
    }); 
  }, []);
  
  useEffect(() => {
    if (!showHero) return;
    const id = setInterval(() => { 
      setPrevIdx(idx); 
      setIdx((i) => (i + 1) % HERO_IMGS.length); 
    }, 8000);
    return () => clearInterval(id);
  }, [idx, showHero]);
  
  const dirClass = (idx % 2 === 0) ? "dir-left" : "dir-right";

  /* ===== Filtros (SIN precio) ===== */
  const [sort, setSort] = useState("default");
  const [moneda, setMoneda] = useState("");
  const [coleccion, setColeccion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [equipo, setEquipo] = useState("Todos");
  const [talle, setTalle] = useState("");

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

  // aplicar filtros (SIN filtro de precio)
  const productos = useMemo(() => {
    let list = rows.filter(
      (p) =>
        (moneda === "" || p.moneda === moneda) &&
        (coleccion === "" || coleccion === "Todas" || p.coleccion === coleccion) &&
        (categoria === "" || categoria === "Todos" || p.categoria === categoria) &&
        (equipo === "Todos" || p.club === equipo) &&
        matchesTalle(p.talle, talle)
    );

    switch (sort) {
      case "price-asc":  list = list.slice().sort((a, b) => a.precio - b.precio); break;
      case "price-desc": list = list.slice().sort((a, b) => b.precio - a.precio); break;
      case "name":       list = list.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)); break;
      default: break;
    }
    return list;
  }, [rows, moneda, coleccion, categoria, equipo, talle, sort]);

  const [anyDdOpen, setAnyDdOpen] = useState(false);

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
    if (!homeFilters) return;
    const {
      sort: _sort,
      moneda: _moneda,
      coleccion: _coleccion,
      categoria: _categoria,
      equipo: _equipo,
      talle: _talle
    } = homeFilters;

    if (_sort !== undefined) setSort(_sort);
    if (_moneda !== undefined) setMoneda(_moneda);
    if (_coleccion !== undefined) setColeccion(_coleccion);
    if (_categoria !== undefined) setCategoria(_categoria);
    if (_equipo !== undefined) setEquipo(_equipo);
    if (_talle !== undefined) setTalle(_talle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHomeFilters({
      sort, moneda, coleccion, categoria, equipo, talle
    });
  }, [sort, moneda, coleccion, categoria, equipo, talle, setHomeFilters]);

  /* ===== Render ===== */
  return (
    <>
      <Header />

      {/* HERO - Solo se muestra si NO viene directo al catálogo */}
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
              icon="↕︎"
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

            <button
              className="btn-reset-filters"
              type="button"
              onClick={resetFilters}
              title="Restablecer filtros"
              disabled={loading || !!error}
            >
              🔄<span> Restablecer</span>
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