import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import LocationModal from "../Modals/LocationModal";
import "../Header/Header.css";
import NotificationDropdown from "../NotificationDropdown/NotificationDropdown";

function getInitials(user) {
    if (!user) return "U";
  
    const nombre = user.user_metadata?.nombre || "";
    const apellido = user.user_metadata?.apellido || "";
  
    if (nombre && apellido) {
      return (
        (nombre[0] + apellido[0]).toUpperCase()
      );
    }
  
    if (nombre) return nombre[0].toUpperCase();
  
    if (user.email) return user.email[0].toUpperCase();
  
    return "U";
  }

export default function HeaderSimplif() {
  const navigate = useNavigate();

  /** ===== Sesión ===== */
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sess) => {
      if (sess?.user) {
        setUser(sess.user);
        localStorage.setItem("user", JSON.stringify(sess.user));
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const fullName =
    user?.user_metadata?.nombre && user?.user_metadata?.apellido
      ? `${user.user_metadata.nombre} ${user.user_metadata.apellido}`
      : null;

  const displayName =
    fullName ||
    user?.user_metadata?.nombre ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "");

  const handleLoginClick = () => navigate("/login");
  const handleLogout = async () => {
    try { await supabase.auth.signOut(); }
    finally {
      localStorage.removeItem("user");
      setUser(null);
      setMenuOpen(false);
      navigate("/");
    }
  };
  const goAndClose = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  /** ===== Ubicación ===== */
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem("userLocation");
    if (saved) setSelectedLocation(JSON.parse(saved));
  }, []);
  const handleLocationSelect = (loc) => {
    setSelectedLocation(loc);
    localStorage.setItem("userLocation", JSON.stringify(loc));
  };
  const getLocationText = () => {
    if (!selectedLocation) return "Enviar a ubicación";
    const { departamento, ciudad } = selectedLocation;
    return `Enviar a ${ciudad}, ${departamento}`;
  };

  /** ===== Categorías dropdown (mock) ===== */
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  return (
    <header id="siteHeader">
      {/* ===== TOP BAR ===== */}
      <div className="top">
        <div className="container top-inner">
          <div className="brand-wrap">
            <a href="/" className="logo-link">
              <img src="/assets/logo.png" alt="La Otra Tribuna" className="logo" />
            </a>
          </div>

          <div className="search">
            <input
              type="search"
              placeholder="Buscar club o país…"
              autoComplete="off"
            />
          </div>

          <div className="header-messages">Publicá, comprá y vendé.</div>

          <div className="actions actions--simplif">
            {user ? (
              <div className="user-menu" ref={menuRef}>
                <button
                  className="user-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="avatar">{getInitials(user)}</span>
                  <span className="hello">
                    Hola,{" "}
                    <strong>
                      {user?.user_metadata?.nombre && user?.user_metadata?.apellido
                        ? `${user.user_metadata.nombre} ${user.user_metadata.apellido}`
                        : displayName || "Usuario"}
                    </strong>
                  </span>
                  <span className="chev">▾</span>
                </button>

                {menuOpen && (
                  <div className="user-dropdown" role="menu">
                    <button className="user-item" role="menuitem" onClick={() => goAndClose("/perfil")}>
                      Mi perfil
                    </button>
                    <button className="user-item" role="menuitem" onClick={() => goAndClose("/my-listings")}>
                      Mis publicaciones
                    </button>
                    <button className="user-item" role="menuitem" onClick={() => goAndClose("/my-orders")}>
                      Mis pedidos
                    </button>
                    <button className="user-item" role="menuitem" onClick={() => goAndClose("/my-sales")}>
                      Mis ventas
                    </button>
                    <button className="user-item danger" role="menuitem" onClick={handleLogout}>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="login-btn" onClick={handleLoginClick}>
                Iniciar sesión
              </button>
            )}

            {/* === Placeholders para mantener el ancho de Favoritos y Carrito === */}
            <span className="pill pill--placeholder" aria-hidden="true" />
            <span className="pill pill--placeholder" aria-hidden="true" />

            {/* Notificaciones visibles (si querés, también podés reemplazar por placeholder) */}
            <NotificationDropdown />
          </div>
        </div>
      </div>

      {/* ===== SUBNAV ===== */}
      <nav className="subnav" aria-label="Subnavegación">
        <div className="container subnav-inner">
          <button className="loc-link" onClick={() => setIsLocationModalOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 22s7-6.46 7-12a7 7 0 1 0-14 0c0 5.54 7 12 7 12Z"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>{getLocationText()}</span>
          </button>

          <div
            className="dropdown"
            onMouseEnter={() => setIsCategoriesOpen(true)}
            onMouseLeave={() => setIsCategoriesOpen(false)}
          >
            <button
              className="subnav-link"
              onClick={() => setIsCategoriesOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={isCategoriesOpen}
            >
              Categorías <span className="chev">▾</span>
            </button>
            {isCategoriesOpen && (
              <div className="dropdown-menu">
                <button>Club</button>
                <button>Selección</button>
                <button>Retro</button>
              </div>
            )}
          </div>

          <button className="subnav-link" onClick={() => navigate("/offers")}>Ofertas</button>
          <button className="subnav-link" onClick={() => navigate("/sell")}>Vender</button>
          <button className="subnav-link" onClick={() => navigate("/track-order")}>Rastrear Pedido</button>
          <button className="subnav-link" onClick={() => navigate("/favorites")}>Favoritos</button>
          <button className="subnav-link" onClick={() => navigate("/how-it-works")}>Cómo funciona</button>
          <button className="subnav-link" onClick={() => navigate("/authenticity")}>Autenticidad</button>
          <button className="subnav-link" onClick={() => navigate("/help")}>Ayuda</button>
        </div>
      </nav>

      {/* Modal de ubicación */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleLocationSelect}
      />
    </header>
  );
}