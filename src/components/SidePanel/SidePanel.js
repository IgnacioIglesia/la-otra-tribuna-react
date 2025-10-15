import React, { useEffect } from "react";
import "./SidePanel.css";

export default function SidePanel({ open, type, onClose }) {
  // bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const title = type === "cart" ? "Tu carrito" : "Tus favoritos";

  return (
    <div className="sp-overlay" onClick={onClose}>
      <aside
        className="sp-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sp-head">
          <h3>{title}</h3>
          <button className="sp-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        <div className="sp-body">
          {/* Estado vacío de ejemplo */}
          <div className="sp-empty">
            {type === "cart" ? "Tu carrito está vacío." : "Aún no agregaste favoritos."}
          </div>

          {/* Aquí podrías mapear items reales:
              items.map(i => <ItemRow key={i.id} ... />)
          */}
        </div>

        <footer className="sp-foot">
          {type === "cart" ? (
            <button className="sp-cta" onClick={() => alert("Ir a pagar (TODO)")}>
              Ir a pagar
            </button>
          ) : (
            <button className="sp-cta" onClick={onClose}>
              Seguir explorando
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}