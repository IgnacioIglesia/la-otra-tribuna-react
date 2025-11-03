import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { UY_DEPARTAMENTOS, UY_CIUDADES_SUGERIDAS } from "../../utilities/uy-depts";
import Dropdown from "../Dropdown/Dropdown";
import "./Modal.css";

export default function LocationModal({
  isOpen,
  onClose,
  onLocationSelect,
  defaultValue,
}) {
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [isAnyDropdownOpen, setIsAnyDropdownOpen] = useState(false);

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

  // Preparar opciones para los dropdowns
  const deptoOptions = useMemo(
    () => UY_DEPARTAMENTOS.map(d => ({ value: d, label: d })),
    []
  );

  const ciudadOptions = useMemo(() => {
    if (!departamento) return [];
    const ciudades = UY_CIUDADES_SUGERIDAS[departamento] || [];
    return ciudades.map(c => ({ value: c, label: c }));
  }, [departamento]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!departamento || !ciudad) return;
    onLocationSelect({ departamento, ciudad });
    onClose();
  };

  const handleDeptoChange = (value) => {
    setDepartamento(value);
    setCiudad(""); // reset ciudad cuando cambia departamento
  };

  // NO cerrar el modal si hay un dropdown abierto
  const handleBackdropClick = (e) => {
    if (isAnyDropdownOpen) return;
    onClose();
  };

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal-card modal-location"
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
          <div className="form-group">
            <label>Departamento *</label>
            <Dropdown
              placeholder="Elegir departamento…"
              value={departamento}
              options={deptoOptions}
              onChange={handleDeptoChange}
              onOpenChange={setIsAnyDropdownOpen}
            />
          </div>

          {/* Ciudad */}
          <div className="form-group">
            <label>Ciudad *</label>
            <Dropdown
              placeholder={
                !departamento
                  ? "Elegí primero un departamento"
                  : "Elegir ciudad…"
              }
              value={ciudad}
              options={ciudadOptions}
              onChange={setCiudad}
              disabled={!departamento}
              onOpenChange={setIsAnyDropdownOpen}
            />
          </div>
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