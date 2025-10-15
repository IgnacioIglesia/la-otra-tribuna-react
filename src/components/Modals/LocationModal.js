import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { UY_DEPARTAMENTOS, UY_CIUDADES_SUGERIDAS } from "../../utilities/uy-depts";
import "./Modal.css";

export default function LocationModal({
  isOpen,
  onClose,
  onLocationSelect,
  defaultValue,
}) {
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");

  // Inicializar valores si había una selección guardada
  useEffect(() => {
    if (!isOpen) return;
    setDepartamento(defaultValue?.departamento || "");
    setCiudad(defaultValue?.ciudad || "");
  }, [isOpen, defaultValue]);

  // Cerrar con ESC, bloquear scroll y limpiar al cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  // Filtrar ciudades según el depto
  const ciudadesDisponibles = useMemo(
    () => (departamento ? UY_CIUDADES_SUGERIDAS[departamento] || [] : []),
    [departamento]
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!departamento || !ciudad) return;
    onLocationSelect({ departamento, ciudad });
    onClose();
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loc-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="loc-modal-title">Seleccionar ubicación</h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <p className="modal-subtitle">
          Elegí tu departamento y ciudad para mejorar los envíos.
        </p>

        <div className="location-form">
          {/* Departamento */}
          <label className="form-group">
            <span>Departamento *</span>
            <select
              value={departamento}
              onChange={(e) => {
                setDepartamento(e.target.value);
                setCiudad(""); // reset ciudad cuando cambia departamento
              }}
            >
              <option value="" disabled>
                Elegir departamento…
              </option>
              {UY_DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          {/* Ciudad */}
          <label className="form-group">
            <span>Ciudad *</span>
            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              disabled={!departamento}
            >
              {!departamento && (
                <option value="">
                  Elegí primero un departamento
                </option>
              )}
              {departamento && (
                <>
                  <option value="" disabled>
                    Elegir ciudad…
                  </option>
                  {ciudadesDisponibles.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleConfirm}
            disabled={!departamento || !ciudad}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}