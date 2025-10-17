// src/pages/Search/SearchPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Header from "../../components/Header/Header";
import "./SearchPage.css";

const money = (n = 0) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

// Mapear categoría como en tu Home
function mapCategoria(cat) {
  if (!cat) return "Club";
  return cat === "Seleccion" ? "Selección" : cat;
}

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    club: "",
    categoria: "",
    precioMax: "",
    orden: "reciente"
  });

  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (query) {
      performSearch();
    } else {
      setLoading(false);
      setResults([]);
      setTotalCount(0);
    }
  }, [query, filters]);

  async function performSearch() {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      console.log("Buscando en SearchPage:", query);
      
      // Intentar con la función RPC con filtros
      const { data, error } = await supabase.rpc("buscar_publicaciones_filtros", {
        p_q: query,
        p_club: filters.club || null,
        p_categoria: filters.categoria || null,
        p_precio_max: filters.precioMax ? Number(filters.precioMax) : null,
        p_orden: filters.orden
      });

      if (error) {
        console.error("Error en RPC con filtros:", error);
        // Fallback a query directa
        let queryBuilder = supabase
          .from("publicacion")
          .select("*, foto (url, orden_foto)")
          .eq("estado", "Activa")
          .or(`titulo.ilike.%${query}%,club.ilike.%${query}%`);

        // Aplicar filtros manualmente
        if (filters.club) {
          queryBuilder = queryBuilder.ilike('club', `%${filters.club}%`);
        }
        if (filters.categoria) {
          queryBuilder = queryBuilder.ilike('categoria', `%${filters.categoria}%`);
        }
        if (filters.precioMax) {
          queryBuilder = queryBuilder.lte('precio', Number(filters.precioMax));
        }

        // Ordenamiento manual
        switch (filters.orden) {
          case 'precio_asc':
            queryBuilder = queryBuilder.order('precio', { ascending: true });
            break;
          case 'precio_desc':
            queryBuilder = queryBuilder.order('precio', { ascending: false });
            break;
          case 'nombre':
            queryBuilder = queryBuilder.order('titulo', { ascending: true });
            break;
          case 'reciente':
          default:
            queryBuilder = queryBuilder.order('id_publicacion', { ascending: false });
        }

        const { data: directData, error: directError } = await queryBuilder;
        
        if (directError) throw directError;

        const formattedData = (directData || []).map(pub => {
          const primeraFoto = pub.foto && pub.foto.length ? pub.foto[0].url : null;

          return {
            id_publicacion: pub.id_publicacion,
            nombre: pub.titulo,
            precio: Number(pub.precio) || 0,
            club: pub.club || "",
            categoria: mapCategoria(pub.categoria),
            img: primeraFoto || "/assets/placeholder.png",
            es_oferta: false
          };
        });

        setResults(formattedData);
        setTotalCount(formattedData.length);
      } else {
        console.log("Resultados con RPC:", data);
        setResults(data || []);
        setTotalCount(data?.length || 0);
      }
    } catch (error) {
      console.error("Error buscando en SearchPage:", error);
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      club: "",
      categoria: "",
      precioMax: "",
      orden: "reciente"
    });
  };

  if (!query) {
    return (
      <div className="search-page">
        <Header />
        <div className="search-content">
          <div className="no-query">
            <h1>Búsqueda</h1>
            <p>Ingresa un término de búsqueda para encontrar camisetas</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-page">
      <Header />
      
      <div className="search-content">
        <div className="search-header">
          <div className="search-info">
            <h1>Resultados para "{query}"</h1>
            <p className="results-count">{totalCount} {totalCount === 1 ? 'resultado' : 'resultados'}</p>
          </div>
        </div>

        <div className="search-layout">
          {/* Sidebar de filtros */}
          <div className="filters-sidebar">
            <div className="filters-header">
              <h3>Filtros</h3>
              <button onClick={clearFilters} className="clear-filters">
                Limpiar
              </button>
            </div>

            <div className="filter-group">
              <label>Ordenar por:</label>
              <select 
                value={filters.orden} 
                onChange={(e) => handleFilterChange('orden', e.target.value)}
              >
                <option value="reciente">Más Reciente</option>
                <option value="nombre">Nombre (A-Z)</option>
                <option value="precio_asc">Precio: Menor a Mayor</option>
                <option value="precio_desc">Precio: Mayor a Menor</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Precio máximo:</label>
              <input
                type="number"
                placeholder="Ej: 5000"
                value={filters.precioMax}
                onChange={(e) => handleFilterChange('precioMax', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Club:</label>
              <input
                type="text"
                placeholder="Filtrar por club"
                value={filters.club}
                onChange={(e) => handleFilterChange('club', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Categoría:</label>
              <input
                type="text"
                placeholder="Filtrar por categoría"
                value={filters.categoria}
                onChange={(e) => handleFilterChange('categoria', e.target.value)}
              />
            </div>
          </div>

          {/* Resultados */}
          <div className="results-container">
            {loading ? (
              <div className="loading-results">
                <div className="spinner"></div>
                <p>Buscando camisetas...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No encontramos resultados para "{query}"</h3>
                <p>Intenta con otros términos de búsqueda o ajusta los filtros</p>
              </div>
            ) : (
              <div className="results-grid">
                {results.map((item) => (
                  <div 
                    key={item.id_publicacion} 
                    className="product-card"
                    onClick={() => navigate(`/publication/${item.id_publicacion}`)}
                  >
                    <div className="product-image">
                      <img 
                        src={item.img || "/assets/placeholder.png"} 
                        alt={item.nombre}
                        onError={(e) => {
                          e.target.src = "/assets/placeholder.png";
                        }}
                      />
                    </div>
                    
                    <div className="product-info">
                      <h3 className="product-title">{item.nombre}</h3>
                      <p className="product-details">
                        {item.club} • {item.categoria}
                      </p>
                      <p className="product-price">{money(item.precio)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}