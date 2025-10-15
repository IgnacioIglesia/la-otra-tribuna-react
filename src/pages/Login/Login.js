import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  // estado del toast (null ó {type, message})
  const [toast, setToast] = useState(null);

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  // Recovery flow (si el usuario viene del link del email)
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [newPwd1, setNewPwd1] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [savingNewPwd, setSavingNewPwd] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Manejo de login normal
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
    setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const back = params.get("return");
      navigate(back || "/", { replace: true });
    }, 1100);
    setLoading(false);
  };

  // Enviar email de recuperación
  const sendRecovery = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      return showToast("Ingresá un email válido.", "error");
    }
    setForgotSending(true);
    try {
      const redirectTo = window.location.origin + "/login"; // volvemos al login para completar el cambio
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo,
      });
      if (error) throw error;
      showToast("Te enviamos un email para restablecer la contraseña.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      console.error(err);
      showToast(err.message || "No se pudo enviar el email.", "error");
    } finally {
      setForgotSending(false);
    }
  };

  // Si volvemos del correo con "PASSWORD_RECOVERY", abrimos modal para setear nueva contraseña
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryOpen(true);
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const submitNewPassword = async (e) => {
    e.preventDefault();
    if (newPwd1.length < 6) return showToast("La contraseña debe tener al menos 6 caracteres.", "error");
    if (newPwd1 !== newPwd2) return showToast("Las contraseñas no coinciden.", "error");
    setSavingNewPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd1 });
      if (error) throw error;
      showToast("¡Contraseña actualizada!");
      setRecoveryOpen(false);
      setNewPwd1("");
      setNewPwd2("");
    } catch (err) {
      console.error(err);
      showToast(err.message || "No se pudo actualizar la contraseña.", "error");
    } finally {
      setSavingNewPwd(false);
    }
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Contraseña</span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => { setForgotEmail(email || ""); setForgotOpen(true); }}
                  style={{ fontSize: 13 }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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

      {/* Modal Forgot Password */}
      {forgotOpen && (
        <div className="addr-modal-backdrop" onClick={() => setForgotOpen(false)}>
          <form
            className="addr-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={sendRecovery}
          >
            <div className="addr-modal-head">
              <h3 className="addr-title">Restablecer contraseña</h3>
              <button className="addr-close" type="button" onClick={() => setForgotOpen(false)}>✕</button>
            </div>

            <div className="addr-form">
              <div className="f">
                <label>Email de tu cuenta</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </div>

              <div className="addr-footer">
                <button type="button" className="btn" onClick={() => setForgotOpen(false)}>Cancelar</button>
                <button type="submit" className="btn primary" disabled={forgotSending}>
                  {forgotSending ? "Enviando…" : "Enviar email"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Recovery (llegando desde el link del mail) */}
      {recoveryOpen && (
        <div className="addr-modal-backdrop" onClick={() => setRecoveryOpen(false)}>
          <form
            className="addr-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitNewPassword}
          >
            <div className="addr-modal-head">
              <h3 className="addr-title">Definir nueva contraseña</h3>
              <button className="addr-close" type="button" onClick={() => setRecoveryOpen(false)}>✕</button>
            </div>

            <div className="addr-form">
              <div className="f">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  value={newPwd1}
                  onChange={(e) => setNewPwd1(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <div className="f">
                <label>Repetir contraseña</label>
                <input
                  type="password"
                  value={newPwd2}
                  onChange={(e) => setNewPwd2(e.target.value)}
                  required
                />
              </div>

              <div className="addr-footer">
                <button type="button" className="btn" onClick={() => setRecoveryOpen(false)}>Cancelar</button>
                <button type="submit" className="btn primary" disabled={savingNewPwd}>
                  {savingNewPwd ? "Guardando…" : "Guardar contraseña"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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