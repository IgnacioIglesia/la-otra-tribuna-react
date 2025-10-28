import React, { useEffect, useRef, useState } from "react";
import "./Dropdown.css";

/**
 * Dropdown glassmorphism (custom select)
 * Props:
 *  - icon?: ReactNode | string
 *  - placeholder?: string
 *  - value: string
 *  - options: Array<{ value: string, label: string }>
 *  - onChange(value: string): void
 *  - disabled?: boolean
 *  - className?: string
 *  - align?: "left" | "right"
 *  - onOpenChange?(open: boolean): void
 */
export default function Dropdown({
  icon = null,
  placeholder = "Seleccioná...",
  value,
  options = [],
  onChange,
  disabled = false,
  className = "",
  align = "left",
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0, width: 220 });
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  // click outside
  useEffect(() => {
    const handler = (e) => {
      // si el click fue fuera del contenedor, cerrar
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOpenChange]);

  // recálculo de posición al abrir / on resize / on scroll
  useEffect(() => {
    const recalc = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const GAP = 8;
      let left = r.left;
      if (align === "right") {
        // Alinear el borde derecho del menú con el botón
        left = r.right - Math.max(r.width, 220);
      }
      setMenuPos({
        left: Math.max(8, left),
        top: r.bottom + GAP,
        width: Math.max(220, r.width),
      });
    };
    if (open) {
      recalc();
      window.addEventListener("resize", recalc);
      window.addEventListener("scroll", recalc, true);
      return () => {
        window.removeEventListener("resize", recalc);
        window.removeEventListener("scroll", recalc, true);
      };
    }
  }, [open, align]);

  const current = options.find((o) => o.value === value);
  const label = current?.label ?? placeholder;

  const toggle = () => {
    if (disabled) return;
    setOpen((o) => {
      const next = !o;
      onOpenChange?.(next);
      return next;
    });
  };

  const pick = (val) => {
    onChange?.(val);
    setOpen(false);
    onOpenChange?.(false);
  };

  return (
    <div className={`dd ${disabled ? "is-disabled" : ""} ${className}`} ref={wrapRef}>
      <button
        type="button"
        className="dd-btn"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        ref={btnRef}
      >
        {icon && <span className="ft-icon" aria-hidden>{icon}</span>}
        <span className="dd-label">{label}</span>
        <span className="dd-caret" aria-hidden>▾</span>
      </button>

      {open && (
        <ul
          className="dd-menu"
          role="listbox"
          // usamos FIXED para evitar que lo tapen las cards, y z-index bien alto
          style={{
            position: "fixed",
            left: `${menuPos.left}px`,
            top: `${menuPos.top}px`,
            width: `${menuPos.width}px`,
            zIndex: 10000,
            pointerEvents: "auto",
          }}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`dd-item ${opt.value === value ? "is-active" : ""}`}
              onClick={() => pick(opt.value)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <span className="dd-check">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
