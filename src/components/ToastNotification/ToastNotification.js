import React, { createContext, useContext, useState, useCallback } from "react";
import "./ToastNotification.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="lot-toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ message, type, onClose }) {
  // ✅ Cambiar íconos - usar campana para success
  const icons = {
    success: "🔔",  // Campana para notificaciones
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div className={`lot-toast lot-toast-${type}`}>
      <div className="lot-toast-icon">{icons[type] || icons.info}</div>
      <div className="lot-toast-message">{message}</div>
      <button className="lot-toast-close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}