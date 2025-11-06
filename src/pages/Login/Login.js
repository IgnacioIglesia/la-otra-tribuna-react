import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./Login.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";

/** Toast bonito y reusable dentro del mismo archivo */
function Toast({ type = "success", message, duration = 3500, onClose }) {
  const ref = React.useRef(null);
  const startX = React.useRef(0);
  const currentX = React.useRef(0);
  const swiping = React.useRef(false);
  const timeoutId = React.useRef(null);

  // Auto-cierre
  React.useEffect(() => {
    timeoutId.current = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timeoutId.current);
  }, [duration, onClose]);

  // Pausar al hover/focus
  const pause = () => {
    if (!ref.current) return;
    ref.current.style.setProperty("--paused", 1);
    clearTimeout(timeoutId.current);
  };
  const resume = () => {
    if (!ref.current) return;
    ref.current.style.setProperty("--paused", 0);
    timeoutId.current = setTimeout(() => onClose?.(), duration);
  };

  // Escape para cerrar
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Swipe para cerrar (mobile)
  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    swiping.current = true;
    pause();
  };
  const onTouchMove = (e) => {
    if (!swiping.current || !ref.current) return;
    currentX.current = e.touches[0].clientX;
    const delta = currentX.current - startX.current;
    ref.current.style.transform = `translateX(${delta}px)`;
    ref.current.style.opacity = `${Math.max(0.4, 1 - Math.abs(delta) / 200)}`;
  };
  const onTouchEnd = () => {
    if (!swiping.current || !ref.current) return;
    const delta = currentX.current - startX.current;
    swiping.current = false;
    if (Math.abs(delta) > 100) {
      // Dismiss
      ref.current.style.transform = `translateX(${delta > 0 ? 500 : -500}px)`;
      ref.current.style.opacity = "0";
      setTimeout(() => onClose?.(), 150);
    } else {
      // Volver a lugar y reanudar
      ref.current.style.transform = "";
      ref.current.style.opacity = "";
      resume();
    }
  };

  const titles = {
    success: "Acceso correcto",
    error: "No pudimos iniciar sesión",
    info: "Información",
    warning: "Atención",
  };

  return (
    <div className="toast-container-pro" aria-live="polite" aria-atomic="true">
      <div
        ref={ref}
        className={`toast-card-pro ${type}`}
        role="status"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ "--duration": `${duration}ms` }}
      >
        <div className="toast-side-accent" aria-hidden="true" />
        <div className="toast-icon-pro" aria-hidden="true">
          {type === "success" && (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.8" />
              <path d="M7 12.5l3 3L17 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {type === "error" && (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          )}
          {type === "info" && (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7.5v.5M12 10v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          )}
          {type === "warning" && (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 9v4M12 16.5v.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <div className="toast-content-pro">
          <div className="toast-title-pro">{titles[type] || titles.info}</div>
          <div className="toast-message-pro">{message}</div>
        </div>

        <button className="toast-close-pro" onClick={onClose} aria-label="Cerrar">×</button>

        <div className="toast-progress-pro" aria-hidden="true">
          <span className="bar" />
        </div>
      </div>
    </div>
  );
}

/** Modal de confirmación de ingreso */
function SuccessModal({ onClose, userName }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="success-modal-backdrop" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon">
          <svg viewBox="0 0 52 52" width="52" height="52">
            <circle cx="26" cy="26" r="25" fill="none" stroke="#10b981" strokeWidth="2"/>
            <path fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" 
                  d="M14 27l7.695 7.695L38 18"/>
          </svg>
        </div>
        <h3 className="success-title">¡Bienvenido{userName ? `, ${userName}` : ''}!</h3>
        <p className="success-message">Has ingresado correctamente</p>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [userName, setUserName] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [newPwd1, setNewPwd1] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [savingNewPwd, setSavingNewPwd] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estado para validación de contraseña en recuperación
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    number: false,
    symbol: false,
    score: 0
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Validar fortaleza de contraseña
  const validatePasswordStrength = (pwd) => {
    const strength = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      score: 0
    };
    strength.score = [strength.length, strength.uppercase, strength.number, strength.symbol].filter(Boolean).length;
    setPasswordStrength(strength);
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

    // Obtener nombre del usuario
    try {
      const { data: userData } = await supabase
        .from("usuario")
        .select("nombre")
        .eq("email", email)
        .maybeSingle();
      
      if (userData?.nombre) {
        setUserName(userData.nombre);
      }
    } catch (err) {
      console.error("Error obteniendo nombre:", err);
    }

    localStorage.setItem("user", JSON.stringify(data.user));
    
    // ✅ Mostrar solo el modal de éxito
    setShowSuccessModal(true);
    
    // ✅ Agregar SOLO notificación al dropdown (sin toast visual)
    window.dispatchEvent(new CustomEvent("new-notification", {
      detail: {
        tipo: "info",
        titulo: "Inicio de sesión exitoso",
        mensaje: "Has ingresado correctamente a tu cuenta",
      }
    }));

    setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const back = params.get("return");
      navigate(back || "/", { replace: true });
    }, 2200);
    
    setLoading(false);
  };

  const sendRecovery = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      return showToast("Ingresá un email válido.", "error");
    }
    setForgotSending(true);
    try {
      const redirectTo = window.location.origin + "/login";
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

  useEffect(() => {
    // Verificar si la URL contiene el fragmento de recuperación
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery' && accessToken) {
      setRecoveryOpen(true);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryOpen(true);
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const submitNewPassword = async (e) => {
    e.preventDefault();
    
    // Validaciones completas
    if (newPwd1.length < 8) {
      return showToast("La contraseña debe tener al menos 8 caracteres.", "error");
    }
    if (!/[A-Z]/.test(newPwd1)) {
      return showToast("La contraseña debe incluir al menos una letra mayúscula.", "error");
    }
    if (!/[0-9]/.test(newPwd1)) {
      return showToast("La contraseña debe incluir al menos un número.", "error");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPwd1)) {
      return showToast("La contraseña debe incluir al menos un símbolo especial.", "error");
    }
    if (newPwd1 !== newPwd2) {
      return showToast("Las contraseñas no coinciden.", "error");
    }

    setSavingNewPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd1 });
      if (error) throw error;
      showToast("¡Contraseña actualizada!");
      setRecoveryOpen(false);
      setNewPwd1("");
      setNewPwd2("");
      setPasswordStrength({ length: false, uppercase: false, number: false, symbol: false, score: 0 });
    } catch (err) {
      console.error(err);
      showToast(err.message || "No se pudo actualizar la contraseña.", "error");
    } finally {
      setSavingNewPwd(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score === 4) return "#16a34a";
    if (passwordStrength.score === 3) return "#f59e0b";
    if (passwordStrength.score === 2) return "#f97316";
    return "#ef4444";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score === 4) return "Fuerte";
    if (passwordStrength.score === 3) return "Media";
    if (passwordStrength.score === 2) return "Débil";
    return "Muy débil";
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

      {recoveryOpen && (
        <div className="addr-modal-backdrop" onClick={() => setRecoveryOpen(false)}>
          <form
            className="addr-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitNewPassword}
            style={{ maxWidth: "500px" }}
          >
            <div className="addr-modal-head">
              <h3 className="addr-title">Definir nueva contraseña</h3>
              <button className="addr-close" type="button" onClick={() => setRecoveryOpen(false)}>✕</button>
            </div>

            <div className="addr-form">
              <div className="f">
                <label>Nueva contraseña</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPwd1}
                    onChange={(e) => {
                      setNewPwd1(e.target.value);
                      validatePasswordStrength(e.target.value);
                    }}
                    placeholder="••••••••"
                    required
                    style={{ paddingRight: "2.5rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.25rem",
                      color: "#6b7280",
                      padding: 0
                    }}
                  >
                    {showNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                {/* Indicador de fortaleza */}
                {newPwd1 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: "0.5rem"
                    }}>
                      <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                        Fortaleza:
                      </span>
                      <span style={{ 
                        fontSize: "0.875rem", 
                        fontWeight: 600,
                        color: getPasswordStrengthColor()
                      }}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div style={{ 
                      height: "4px", 
                      background: "#e5e7eb", 
                      borderRadius: "2px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${(passwordStrength.score / 4) * 100}%`,
                        background: getPasswordStrengthColor(),
                        transition: "all 0.3s"
                      }} />
                    </div>
                    <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                        <span style={{ color: passwordStrength.length ? "#16a34a" : "#9ca3af" }}>
                          {passwordStrength.length ? "✓" : "○"}
                        </span>
                        <span style={{ color: passwordStrength.length ? "#374151" : "#9ca3af" }}>
                          Mínimo 8 caracteres
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                        <span style={{ color: passwordStrength.uppercase ? "#16a34a" : "#9ca3af" }}>
                          {passwordStrength.uppercase ? "✓" : "○"}
                        </span>
                        <span style={{ color: passwordStrength.uppercase ? "#374151" : "#9ca3af" }}>
                          Una letra mayúscula
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                        <span style={{ color: passwordStrength.number ? "#16a34a" : "#9ca3af" }}>
                          {passwordStrength.number ? "✓" : "○"}
                        </span>
                        <span style={{ color: passwordStrength.number ? "#374151" : "#9ca3af" }}>
                          Un número
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                        <span style={{ color: passwordStrength.symbol ? "#16a34a" : "#9ca3af" }}>
                          {passwordStrength.symbol ? "✓" : "○"}
                        </span>
                        <span style={{ color: passwordStrength.symbol ? "#374151" : "#9ca3af" }}>
                          Un símbolo especial (!@#$%^&*)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="f">
                <label>Repetir contraseña</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={newPwd2}
                    onChange={(e) => setNewPwd2(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ paddingRight: "2.5rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.25rem",
                      color: "#6b7280",
                      padding: 0
                    }}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {newPwd2 && newPwd1 !== newPwd2 && (
                  <div style={{ 
                    marginTop: "0.5rem", 
                    fontSize: "0.875rem", 
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <span>✕</span>
                    <span>Las contraseñas no coinciden</span>
                  </div>
                )}
                {newPwd2 && newPwd1 === newPwd2 && (
                  <div style={{ 
                    marginTop: "0.5rem", 
                    fontSize: "0.875rem", 
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <span>✓</span>
                    <span>Las contraseñas coinciden</span>
                  </div>
                )}
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

      {showSuccessModal && (
        <SuccessModal 
          onClose={() => setShowSuccessModal(false)} 
          userName={userName}
        />
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