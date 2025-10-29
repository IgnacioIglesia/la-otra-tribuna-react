import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [openUp, setOpenUp] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // click outside (no cerrar si se hace click dentro del menú)
  useEffect(() => {
    const handler = (e) => {
      const insideButton = wrapRef.current?.contains(e.target);
      const insideMenu = menuRef.current?.contains(e.target);
      if (!insideButton && !insideMenu) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onOpenChange]);

  // recalcular posición y dirección (abre arriba o abajo)
  useEffect(() => {
    const recalc = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const GAP = 8;
      let left = r.left;
      if (align === "right") {
        left = r.right - Math.max(r.width, 220);
      }

      const estimatedMenuH = 260;
      const spaceBelow = window.innerHeight - r.bottom - GAP;
      const spaceAbove = r.top - GAP;
      const shouldOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow;
      setOpenUp(shouldOpenUp);

      setMenuPos({
        left: Math.max(8, left),
        top: shouldOpenUp
          ? Math.max(8, r.top - estimatedMenuH - GAP)
          : r.bottom + GAP,
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
    <div
      className={`dd ${disabled ? "is-disabled" : ""} ${className}`}
      ref={wrapRef}
    >
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

      {open &&
        createPortal(
          <ul
            className={`dd-menu ${openUp ? "dd-up" : ""}`}
            role="listbox"
            ref={menuRef}
            onMouseDown={(e) => e.stopPropagation()}
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
                className={`dd-item ${
                  opt.value === value ? "is-active" : ""
                }`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  pick(opt.value);
                }}
              >
                <span>{opt.label}</span>
                {opt.value === value && <span className="dd-check">✓</span>}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
