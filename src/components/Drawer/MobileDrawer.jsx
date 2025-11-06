// src/components/Drawer/MobileDrawer.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SearchBar from "../SearchBar/SearchBar";
import "./MobileDrawer.css";

export default function MobileDrawer({ 
  open, 
  onClose, 
  items = [], 
  onLocationClick,
  currentLocation 
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleItemClick = (item) => {
    // ✅ Manejar acción especial de ubicación
    if (item.action === "location") {
      if (onLocationClick) onLocationClick();
      return;
    }

    onClose();

    if (item.state) {
      if (location.pathname === "/") {
        window.location.hash = "#catalogo";
      } else {
        navigate(item.href, { state: item.state });
      }
    } else {
      navigate(item.href);
    }
  };

  const getLocationText = () => {
    if (!currentLocation) return "No seleccionada";
    return `${currentLocation.ciudad}, ${currentLocation.departamento}`;
  };

  return (
    <div className={`lot-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer-panel">
        <div className="drawer-head">
          <span>Menú</span>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="drawer-search">
          <SearchBar />
        </div>

        <ul className="drawer-list">
          {items.map((it, idx) => (
            <li key={it.href || idx}>
              <button 
                onClick={() => handleItemClick(it)}
                className="drawer-link"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{it.label}</span>
                
                {/* ✅ Mostrar ubicación actual si es el item de ubicación */}
                {it.action === "location" && (
                  <span style={{
                    fontSize: '12px',
                    color: currentLocation ? '#059669' : '#9ca3af',
                    fontWeight: 500
                  }}>
                    {getLocationText()}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}