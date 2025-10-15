// src/components/Drawer/Drawer.jsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "./Drawer.css";

export default function Drawer({
  open,
  title = "",
  onClose,
  width = 420,
  children,
  footer = null,
}) {
  // bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={`lot-drawer lot-drawer--open`} aria-modal="true" role="dialog">
      <button className="lot-drawer__backdrop" aria-label="Cerrar" onClick={onClose} />
      <section
        className="lot-drawer__panel"
        style={{ width: Math.min(width, window.innerWidth) }}
      >
        <header className="lot-drawer__header">
          <h3>{title}</h3>
          <button className="lot-drawer__close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <div className="lot-drawer__content">{children}</div>
        {footer ? <footer className="lot-drawer__footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body
  );
}