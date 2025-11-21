import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SearchBar from "../SearchBar/SearchBar";
import "./MobileDrawer.css";

export default function MobileDrawer({
  open,
  onClose,
  items = [],
  onLocationClick,
  currentLocation,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Bloquea scroll cuando el drawer está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleItemClick = (item) => {
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
          <button onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
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
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{it.label}</span>

                {it.action === "location" && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: currentLocation ? "#059669" : "#9ca3af",
                      fontWeight: 500,
                    }}
                  >
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
