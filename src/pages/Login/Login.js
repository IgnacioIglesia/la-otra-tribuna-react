import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./Login.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";

/** Toast bonito y reusable dentro del mismo archivo */
function Toast({ type = "success", message, duration = 2000, onClose }) {
  // autocierre
  useEffect(() => {
    const id = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(id);
  }, [duration, onClose]);

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      <div className={`toast-card ${type}`} role="status">
        <div className="toast-icon" aria-hidden="true">
          {type === "success" ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#16a34a" strokeWidth="1.5" fill="#22c55e33" />
              <path d="M7 12.5l3.2 3.2L17 9" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#dc2626" strokeWidth="1.5" fill="#fecaca66" />
              <path d="M8 8l8 8M16 8l-8 8" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <div className="toast-content">
          <div className="toast-title">
            {type === "success" ? "Acceso correcto" : "No pudimos iniciar sesión"}
          </div>
          <div className="toast-message">{message}</div>
        </div>

        <button className="toast-close" onClick={onClose} aria-label="Cerrar">×</button>

        {/* Barra de progreso */}
        <div className="toast-progress">
          <span className="bar" />
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  // estado del toast (null ó {type, message})
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showToast(error.message || "Revisá tus credenciales.", "error");
      setLoading(false);
      return;
    }

    localStorage.setItem("user", JSON.stringify(data.user));
    showToast("Sesión iniciada correctamente");
    // damos tiempo a ver el toast y redirigimos
    setTimeout(() => navigate("/"), 1100);
    setLoading(false);
  };

  return (
    <>
      <HeaderSimplif />

      <main className="auth-wrap">
        <form className="auth-card" onSubmit={handleLogin} noValidate>
          <div className="auth-head">
            <img src="/assets/logo.png" alt="La Otra Tribuna" className="auth-logo" />
            <h2 className="auth-title">Iniciar sesión</h2>
          </div>

          <div className="auth-body">
            <div className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <span>Contraseña</span>
              <input
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

            <p className="alt">
              ¿No tenés cuenta? <Link to="/register">Registrate</Link>
            </p>
          </div>
        </form>
      </main>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={2200}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}