import React from "react";
import "./MobileDrawer.css";

export default function MobileDrawer({ open, onClose, items = [] }) {
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
              <a href={it.href} onClick={onClose}>{it.label}</a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
