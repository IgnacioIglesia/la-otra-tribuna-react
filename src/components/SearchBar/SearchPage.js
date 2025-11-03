// src/pages/Search/SearchPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Header from "../../components/Header/Header";
import ProductGrid from "../../components/ProductGrid/ProductGrid";
import Dropdown from "../../components/Dropdown/Dropdown";
import "./SearchPage.css";

// Utils
function mapCategoria(cat) {
  if (!cat) return "Club";
  return cat === "Seleccion" ? "Selección" : cat;
}

const uniqueSorted = (arr) =>
  Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function matchesTalle(prodTalle, selected) {
  if (!selected || selected === "Todos") return true;
  const wanted = String(selected).toUpperCase().trim();
  const raw = String(prodTalle || "").toUpperCase();
  const tokens = raw.split(/[^A-Z0-9]+/).filter(Boolean);
  return tokens.some((t) => t === wanted);
}

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Filtros
  const [sort, setSort] = useState("default");
  const [moneda, setMoneda] = useState("");
  const [coleccion, setColeccion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [equipo, setEquipo] = useState("Todos");
  const [talle, setTalle] = useState("");
  const [anyDdOpen, setAnyDdOpen] = useState(false);

  const hasCategoria = categoria === "Club" || categoria === "Selección";

  // Obtener usuario actual
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id ?? null);
    })();
  }, []);

  // Cargar resultados de búsqueda
  useEffect(() => {
    if (query) {
      performSearch();
    } else {
      setLoading(false);
      setRows([]);
    }
  }, [query]);

  async function performSearch() {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("buscar_publicaciones", {
        p_q: query,
        p_limit: 100,
      });

      if (error) {
        console.error("Error en RPC:", error);
        const { data: directData, error: directError } = await supabase
          .from("publicacion")
          .select("*, foto (url, orden_foto)")
          .eq("estado", "Activa")
          .gt("stock", 0)
          .or(`titulo.ilike.%${query}%,club.ilike.%${query}%`)
          .order("id_publicacion", { ascending: false });

        if (directError) throw directError;

        const formattedData = (directData || []).map(pub => {
          const primeraFoto = pub.foto && pub.foto.length ? pub.foto[0].url : null;

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
            img: primeraFoto || "https://placehold.co/600x750?text=Camiseta",
            talle: pub.talle || "",
          };
        });

        setRows(formattedData);
      } else {
        const formattedData = (data || []).map(item => ({
          id: item.id_publicacion,
          ownerId: item.id_usuario || null,
          isOwn: !!currentUserId && item.id_usuario === currentUserId,
          nombre: item.nombre,
          precio: Number(item.precio) || 0,
          moneda: item.moneda || "USD",
          club: item.club || "",
          categoria: mapCategoria(item.categoria),
          coleccion: item.coleccion || "Actual",
          stock: Number(item.stock) || 0,
          img: item.img || "https://placehold.co/600x750?text=Camiseta",
          talle: item.talle || "",
        }));

        setRows(formattedData);
      }
    } catch (error) {
      console.error("Error buscando:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // Categorías disponibles
  const categorias = useMemo(() => {
    let base = rows;
    if (moneda) base = base.filter((p) => p.moneda === moneda);
    if (coleccion && coleccion !== "Todas") base = base.filter((p) => p.coleccion === coleccion);
    const unique = Array.from(new Set(base.map((p) => p.categoria).filter(Boolean)));
    const allowed = ["Club", "Selección"];
    return unique.filter((c) => allowed.includes(c));
  }, [rows, coleccion, moneda]);

  // Equipos ordenados
  const equipos = useMemo(() => {
    let base = rows;
    if (moneda) base = base.filter((p) => p.moneda === moneda);
    if (coleccion && coleccion !== "Todas") base = base.filter((p) => p.coleccion === coleccion);

    if (!hasCategoria) {
      const list = uniqueSorted(base.map((p) => p.club));
      return ["Todos", ...list];
    }
    base = base.filter((p) => p.categoria === categoria);
    const list = uniqueSorted(base.map((p) => p.club));
    return ["Todos", ...list];
  }, [rows, moneda, coleccion, categoria, hasCategoria]);

  // Aplicar filtros
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

  const resetFilters = () => {
    setSort("default");
    setMoneda("");
    setColeccion("");
    setCategoria("");
    setEquipo("Todos");
    setTalle("");
    setAnyDdOpen(false);
  };

  if (!query) {
    return (
      <div className="search-page">
        <Header />
        <div className="container search-content">
          <div className="no-query">
            <h1>Búsqueda</h1>
            <p>Ingresa un término de búsqueda para encontrar camisetas</p>
          </div>
        </div>
      </div>
    );
  }

  // Opciones para dropdowns
  const sortOptions = [
    { value: "default",    label: "Por defecto" },
    { value: "price-asc",  label: "Precio: menor a mayor" },
    { value: "price-desc", label: "Precio: mayor a menor" },
    { value: "name",       label: "Nombre (A–Z)" },
  ];

  const monedaOptions = [
    { value: "ALL", label: "Todas" },
    { value: "USD", label: "USD" },
    { value: "UYU", label: "UYU" },
  ];

  const coleccionOptions = [
    { value: "Todas",  label: "Todas" },
    { value: "Actual", label: "Actual" },
    { value: "Retro",  label: "Retro" },
  ];

  const categoriaOptions = [
    { value: "Todos", label: "Todos" },
    ...categorias.map((c) => ({ value: c, label: c })),
  ];

  const equipoOptions = (hasCategoria ? equipos : ["Todos"]).map((eq) =>
    typeof eq === "string"
      ? { value: eq, label: eq }
      : { value: eq, label: eq === "Todos" ? "Todos" : eq }
  );

  const talleOptions = [
    { value: "Todos", label: "Todos" },
    ...SIZES.map((s) => ({ value: s, label: s })),
  ];

  return (
    <div className="search-page">
      <Header />
      
      <div className="container search-content">
        <div className="search-header">
          <h1>Resultados para "{query}"</h1>
          {!loading && <p className="results-count">{productos.length} {productos.length === 1 ? 'resultado' : 'resultados'}</p>}
        </div>

        {/* ===== FILTROS HORIZONTALES (MÓVIL/TABLET) ===== */}
        <div className={`filters-toolbar-mobile ${anyDdOpen ? "dd-open" : ""}`}>
          <div className="filters-single-row">
            <Dropdown
              icon="↕︎"
              value={sort}
              onChange={setSort}
              onOpenChange={setAnyDdOpen}
              options={sortOptions}
            />

            <Dropdown
              icon="↕︎"
              placeholder="Elegí moneda"
              value={moneda}
              onChange={(v) => { const sel = v === "ALL" ? "" : v; setMoneda(sel); }}
              onOpenChange={setAnyDdOpen}
              options={monedaOptions}
            />

            <Dropdown
              icon="↕︎"
              placeholder="Elegí colección"
              value={coleccion}
              onChange={setColeccion}
              onOpenChange={setAnyDdOpen}
              options={coleccionOptions}
            />

            <Dropdown
              icon="↕"
              placeholder="Elegí categoría"
              value={categoria}
              onChange={(v) => { setCategoria(v); setEquipo("Todos"); }}
              onOpenChange={setAnyDdOpen}
              options={categoriaOptions}
            />

            <Dropdown
              icon="↕︎"
              placeholder="Elegí equipo"
              value={hasCategoria ? equipo : "Todos"}
              onChange={setEquipo}
              onOpenChange={setAnyDdOpen}
              disabled={!hasCategoria}
              options={equipoOptions}
            />

            <Dropdown
              icon="↕︎"
              placeholder="Elegí talle"
              value={talle}
              onChange={setTalle}
              onOpenChange={setAnyDdOpen}
              options={talleOptions}
            />

            <button
              className="btn-reset-filters"
              type="button"
              onClick={resetFilters}
              title="Restablecer filtros"
              disabled={loading}
            >
              🔄<span> Restablecer</span>
            </button>
          </div>
        </div>

        <div className="search-layout">
          {/* ===== SIDEBAR DE FILTROS (DESKTOP) ===== */}
          <aside className="filters-sidebar">
            <div className="filters-header">
              <h3>Filtros</h3>
              <button onClick={resetFilters} className="clear-filters" type="button">
                Limpiar
              </button>
            </div>

            <div className="filter-group">
              <label>Ordenar por:</label>
              <Dropdown
                value={sort}
                onChange={setSort}
                options={sortOptions}
              />
            </div>

            <div className="filter-group">
              <label>Moneda:</label>
              <Dropdown
                placeholder="Todas"
                value={moneda}
                onChange={(v) => { const sel = v === "ALL" ? "" : v; setMoneda(sel); }}
                options={monedaOptions}
              />
            </div>

            <div className="filter-group">
              <label>Colección:</label>
              <Dropdown
                placeholder="Todas"
                value={coleccion}
                onChange={setColeccion}
                options={coleccionOptions}
              />
            </div>

            <div className="filter-group">
              <label>Categoría:</label>
              <Dropdown
                placeholder="Todos"
                value={categoria}
                onChange={(v) => { setCategoria(v); setEquipo("Todos"); }}
                options={categoriaOptions}
              />
            </div>

            <div className="filter-group">
              <label>Equipo:</label>
              <Dropdown
                placeholder="Todos"
                value={hasCategoria ? equipo : "Todos"}
                onChange={setEquipo}
                disabled={!hasCategoria}
                options={equipoOptions}
              />
            </div>

            <div className="filter-group">
              <label>Talle:</label>
              <Dropdown
                placeholder="Todos"
                value={talle}
                onChange={setTalle}
                options={talleOptions}
              />
            </div>
          </aside>

          {/* ===== RESULTADOS ===== */}
          <div className="results-container">
            {loading ? (
              <div className="loading-results">
                <div className="spinner"></div>
                <p>Buscando camisetas...</p>
              </div>
            ) : productos.length === 0 ? (
              <div className="empty">
                <p>No hay productos que coincidan con tu búsqueda.</p>
              </div>
            ) : (
              <ProductGrid products={productos} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}