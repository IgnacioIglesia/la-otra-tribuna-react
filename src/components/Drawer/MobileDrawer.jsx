// MobileDrawer.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./MobileDrawer.css";

export default function MobileDrawer({ open, onClose, items = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleItemClick = (item) => {
    // Cerrar el drawer
    onClose();

    // Si el item tiene state (como Catálogo), navegar con ese state
    if (item.state) {
      // Si ya estamos en Home, usar hash
      if (location.pathname === "/") {
        window.location.hash = "#catalogo";
      } else {
        // Si venimos de otra página, navegar con state
        navigate(item.href, { state: item.state });
      }
    } else {
      // Para otros items, navegación normal
      navigate(item.href);
    }
  };

  return (
    <div className={`lot-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer-panel">
        <div className="drawer-head">
          <span>Menú</span>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <ul className="drawer-list">
          {items.map((it) => (
            <li key={it.href}>
              <button 
                onClick={() => handleItemClick(it)}
                className="drawer-link"
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}