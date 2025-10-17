// src/components/SearchBar/SearchBar.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./SearchBar.css";

// Formateo de moneda
const money = (n = 0) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

// Normaliza texto para resaltar resultados
const normalize = (s = "") =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

// Hook para el historial
const useSearchHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('search-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading search history:", e);
        setHistory([]);
      }
    }
  }, []);

  const addToHistory = (term) => {
    if (!term.trim()) return;
    
    const normalizedTerm = term.trim().toLowerCase();
    const newHistory = [
      normalizedTerm,
      ...history.filter(item => item !== normalizedTerm)
    ].slice(0, 8);
    
    setHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search-history');
  };

  const removeFromHistory = (termToRemove) => {
    const newHistory = history.filter(item => item !== termToRemove);
    setHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  return { history, addToHistory, clearHistory, removeFromHistory };
};

// Mapear categoría como en tu Home
function mapCategoria(cat) {
  if (!cat) return "Club";
  return cat === "Seleccion" ? "Selección" : cat;
}

export default function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const debRef = useRef(null);
  
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory();

  // Prevenir scroll del body cuando el dropdown está abierto
  useEffect(() => {
    if (open) {
      document.body.classList.add('search-dropdown-open');
    } else {
      document.body.classList.remove('search-dropdown-open');
    }

    return () => {
      document.body.classList.remove('search-dropdown-open');
    };
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!q.trim()) {
      setResults([]);
      setShowHistory(true);
      setOpen(false);
      return;
    }
    
    debRef.current = setTimeout(() => {
      search(q.trim());
    }, 300);
    
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [q]);

  async function search(term) {
    if (!term.trim()) return;
    
    setLoading(true);
    setShowHistory(false);
    try {
      console.log("Buscando:", term);
      
      // PRIMERO: Intentar con la función RPC
      const { data, error } = await supabase.rpc("buscar_publicaciones", {
        p_q: term,
        p_limit: 8,
      });

      if (error) {
        console.error("Error en RPC buscar_publicaciones:", error);
        // Si falla, intentar con la función simple
        const { data: simpleData, error: simpleError } = await supabase.rpc("buscar_publicaciones_simple", {
          search_term: term
        });

        if (simpleError) {
          console.error("Error en RPC simple:", simpleError);
          throw simpleError;
        }

        // Mapear datos de la función simple
        const formattedData = (simpleData || []).map(item => ({
          id_publicacion: item.id_publicacion,
          nombre: item.titulo,
          precio: Number(item.precio) || 0,
          club: item.club || "",
          categoria: item.categoria,
          img: item.imagen || "/assets/placeholder.png",
          es_oferta: false
        }));

        console.log("Resultados con función simple:", formattedData);
        setResults(formattedData);
      } else {
        console.log("Resultados con función principal:", data);
        setResults(data || []);
      }

      setOpen(true);
      setActiveIdx(-1);
    } catch (e) {
      console.error("Error completo en búsqueda:", e);
      
      // FALLBACK FINAL: Query directa
      try {
        console.log("Intentando búsqueda directa final...");
        const { data, error } = await supabase
          .from("publicacion")
          .select("*, foto (url, orden_foto)")
          .eq("estado", "Activa")
          .or(`titulo.ilike.%${term}%,club.ilike.%${term}%`)
          .order("id_publicacion", { ascending: false })
          .limit(8);

        if (error) throw error;

        const formattedData = (data || []).map(pub => {
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

        console.log("Resultados con query directa:", formattedData);
        setResults(formattedData);
        setOpen(true);
        setActiveIdx(-1);
      } catch (finalError) {
        console.error("Error en búsqueda final:", finalError);
        setResults([]);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (term) => {
    if (term.trim()) {
      addToHistory(term);
      navigate(`/search?q=${encodeURIComponent(term.trim())}`);
      setOpen(false);
      setQ("");
    }
  };

  // Cerrar al click afuera
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!boxRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Scroll al elemento activo con teclado
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIdx];
      if (activeElement) {
        activeElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth"
        });
      }
    }
  }, [activeIdx]);

  // Navegación con teclado mejorada
  const onKeyDown = (e) => {
    if (!open && e.key !== "Escape") {
      if (results.length > 0 || history.length > 0) {
        setOpen(true);
        setShowHistory(!q.trim() && history.length > 0);
      }
      return;
    }

    const itemCount = showHistory ? history.length : results.length;
    const max = itemCount - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => (i < max ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => (i > 0 ? i - 1 : max));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < itemCount) {
          if (showHistory) {
            handleSearch(history[activeIdx]);
          } else {
            goTo(results[activeIdx].id_publicacion);
          }
        } else if (q.trim()) {
          handleSearch(q);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIdx(-1);
        break;
      default:
        break;
    }
  };

  const goTo = (id) => {
    if (!id) {
      console.error("ID de publicación no válido");
      return;
    }
    setOpen(false);
    setQ("");
    setActiveIdx(-1);
    addToHistory(q);
    navigate(`/publication/${id}`);
  };

  // Resaltado mejorado del término buscado
  const highlight = (text) => {
    const src = text || "";
    const nq = normalize(q);
    if (!nq) return src;
    
    const nt = normalize(src);
    const idx = nt.indexOf(nq);
    if (idx === -1) return src;
    
    const end = idx + nq.length;
    return (
      <>
        {src.slice(0, idx)}
        <mark className="highlight-match">{src.slice(idx, end)}</mark>
        {src.slice(end)}
      </>
    );
  };

  const handleInputFocus = () => {
    if (q.trim()) {
      setOpen(true);
      setShowHistory(false);
    } else if (history.length > 0) {
      setShowHistory(true);
      setOpen(true);
    }
  };

  return (
    <div className="search-bar" ref={boxRef}>
      <div className="search-input-container">
        <div className="search-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        <input
          type="search"
          className="search-input"
          placeholder="Buscar camisetas, clubes, países, categorías..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={onKeyDown}
          aria-label="Buscar camisetas de fútbol"
          autoComplete="off"
          aria-expanded={open}
          aria-controls="search-results"
        />
        
        {q && (
          <button
            className="clear-button"
            onClick={() => {
              setQ("");
              setResults([]);
              setActiveIdx(-1);
              setShowHistory(true);
            }}
            aria-label="Limpiar búsqueda"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div 
          id="search-results"
          className="search-results-panel"
          role="listbox"
          aria-label="Resultados de búsqueda"
          ref={listRef}
        >
          {showHistory && history.length > 0 && (
            <>
              <div className="results-header">
                <span className="results-count">Búsquedas recientes</span>
                <button 
                  className="clear-history-btn"
                  onClick={clearHistory}
                  type="button"
                >
                  Limpiar
                </button>
              </div>
              {history.map((item, i) => (
                <button
                  key={item}
                  className={`search-result-item history-item ${i === activeIdx ? "active" : ""}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => handleSearch(item)}
                  type="button"
                >
                  <div className="history-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <span className="history-term">{item}</span>
                  <button
                    className="remove-history-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(item);
                    }}
                    type="button"
                    aria-label="Eliminar del historial"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </button>
              ))}
            </>
          )}

          {loading && (
            <div className="search-result-item loading-state">
              <div className="loading-spinner"></div>
              <span>Buscando camisetas...</span>
            </div>
          )}

          {!loading && !showHistory && results.length === 0 && q.trim() && (
            <div className="search-result-item no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-text">
                <p>No encontramos resultados para <strong>"{q}"</strong></p>
                <button
                  className="view-all-button"
                  onClick={() => handleSearch(q)}
                  type="button"
                >
                  Ver todos los resultados
                </button>
              </div>
            </div>
          )}

          {!loading && !showHistory && results.length > 0 && (
            <>
              <div className="results-header">
                <span className="results-count">
                  {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
                </span>
              </div>
              
              {results.map((r, i) => (
                <button
                  key={r.id_publicacion}
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`search-result-item ${i === activeIdx ? "active" : ""}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => goTo(r.id_publicacion)}
                  type="button"
                >
                  <div className="result-image">
                    <img
                      src={r.img || "/assets/placeholder.png"}
                      alt={r.nombre}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = "/assets/placeholder.png";
                      }}
                    />
                  </div>
                  
                  <div className="result-info">
                    <div className="result-title">{highlight(r.nombre)}</div>
                    <div className="result-details">
                      <span className="club">{r.club || "Sin club"}</span>
                      <span className="separator">•</span>
                      <span className="category">{r.categoria || "Sin categoría"}</span>
                    </div>
                  </div>
                  
                  <div className="result-price">
                    {money(r.precio)}
                  </div>
                </button>
              ))}
            </>
          )}

          {!loading && !showHistory && q.trim() && results.length > 0 && (
            <div className="search-footer">
              <button
                className="view-all-results-button"
                onClick={() => handleSearch(q)}
                type="button"
              >
                Ver todos los resultados para "{q}"
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14m-7-7l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}