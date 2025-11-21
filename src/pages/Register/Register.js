import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  // null = pantalla selección, "full" = completo, "impostor" = solo juego
  const [registerType, setRegisterType] = useState(null);
  const [step, setStep] = useState(1);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmPassword: "",
    accept: false,
    pais: "Uruguay",
    departamento: "",
    ciudad: "",
    direccion: "",
    cp: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    number: false,
    symbol: false,
    score: 0,
  });

  const [error, setError] = useState("");
  const [overlay, setOverlay] = useState({
    open: false,
    type: "ok",
    title: "",
    text: "",
  });

  const update = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "password") validatePasswordStrength(v);
  };

  const validatePasswordStrength = (pwd) => {
    const s = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      score: 0,
    };
    s.score = [s.length, s.uppercase, s.number, s.symbol].filter(Boolean).length;
    setPasswordStrength(s);
  };

  const validateStep1 = () => {
    if (!form.nombre.trim() || form.nombre.trim().length < 2)
      return "Por favor, ingresá tu nombre (mínimo 2 caracteres).";
    if (!form.apellido.trim() || form.apellido.trim().length < 2)
      return "Por favor, ingresá tu apellido (mínimo 2 caracteres).";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Por favor, ingresá un email válido.";
    if (!form.password || form.password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(form.password))
      return "La contraseña debe incluir al menos una letra mayúscula.";
    if (!/[0-9]/.test(form.password))
      return "La contraseña debe incluir al menos un número.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password))
      return "La contraseña debe incluir al menos un símbolo especial.";
    if (form.password !== form.confirmPassword)
      return "Las contraseñas no coinciden.";
    if (!form.accept)
      return "Debes aceptar los Términos y Condiciones para continuar.";
    return null;
  };

  const validateStep2 = () => {
    if (!form.departamento.trim()) return "Por favor, ingresá tu departamento.";
    if (!form.ciudad.trim()) return "Por favor, ingresá tu ciudad.";
    if (!form.direccion.trim()) return "Por favor, ingresá tu dirección.";
    if (!form.cp.trim() || !/^\d{5}$/.test(form.cp.trim()))
      return "El código postal debe tener 5 dígitos.";
    return null;
  };

  const handleImpostorSubmit = async () => {
    setSubmitting(true);
    try {
      const redirectTo =
        window.location.origin + "/login" + (location.search || "");
      const { error: signErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            tipo_registro: "impostor",
          },
        },
      });

      if (signErr) {
        const already = /already.*registered|exists/i.test(signErr.message || "");
        setOverlay({
          open: true,
          type: "error",
          title: already ? "Email ya registrado" : "No se pudo crear la cuenta",
          text: already
            ? "Ese email ya está registrado. Por favor, iniciá sesión."
            : signErr.message || "Ocurrió un error.",
        });
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        setOverlay({
          open: true,
          type: "ok",
          title: "¡Revisá tu correo! 📧",
          text: "Te enviamos un email de confirmación. Revisá tu bandeja de entrada y spam.",
        });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setOverlay({
          open: true,
          type: "ok",
          title: "¡Cuenta creada! 🎮",
          text: "Ya podés jugar al Impostor. Redirigiendo...",
        });
        setTimeout(() => navigate("/impostor"), 1500);
      }
    } catch (err) {
      console.error(err);
      setOverlay({
        open: true,
        type: "error",
        title: "Error inesperado",
        text: err?.message || "Ocurrió un error. Por favor, intentá nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async (e) => {
    e.preventDefault();
    const msg = validateStep1();
    if (msg) return setError(msg);
    setError("");
    setCheckingEmail(true);

    try {
      const { data, error: rpcErr } = await supabase.rpc("email_existe", {
        p_email: form.email.trim(),
      });

      if (rpcErr) {
        console.warn("RPC email_existe falló:", rpcErr);
        if (registerType === "impostor") {
          await handleImpostorSubmit();
        } else {
          setStep(2);
        }
        return;
      }

      if (data === true) {
        setError("Este email ya está registrado. Por favor, iniciá sesión.");
        return;
      }

      if (registerType === "impostor") {
        await handleImpostorSubmit();
      } else {
        setStep(2);
      }
    } catch (err) {
      console.warn(err);
      if (registerType === "impostor") {
        await handleImpostorSubmit();
      } else {
        setStep(2);
      }
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = validateStep2();
    if (msg) return setError(msg);
    setError("");
    setSubmitting(true);

    try {
      const redirectTo =
        window.location.origin + "/login" + (location.search || "");
      const { error: signErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            pais: form.pais.trim(),
            departamento: form.departamento.trim(),
            ciudad: form.ciudad.trim(),
            calle: form.direccion.trim(),
            numero: null,
            cp: form.cp.trim(),
            tipo_registro: "completo",
          },
        },
      });

      if (signErr) {
        const already = /already.*registered|exists/i.test(signErr.message || "");
        setOverlay({
          open: true,
          type: "error",
          title: already ? "Email ya registrado" : "No se pudo crear la cuenta",
          text: already
            ? "Ese email ya está registrado. Por favor, iniciá sesión."
            : signErr.message || "Ocurrió un error.",
        });
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        setOverlay({
          open: true,
          type: "ok",
          title: "¡Revisá tu correo! 📧",
          text: "Te enviamos un email de confirmación. Revisá tu bandeja de entrada y spam.",
        });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setOverlay({
          open: true,
          type: "ok",
          title: "¡Cuenta creada exitosamente! 🎉",
          text: "Tu cuenta se creó correctamente. Redirigiendo al inicio...",
        });
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err) {
      console.error(err);
      setOverlay({
        open: true,
        type: "error",
        title: "Error inesperado",
        text: err?.message || "Ocurrió un error. Por favor, intentá nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = (e) => {
    e.preventDefault();
    setError("");
    if (step === 1) {
      setRegisterType(null);
    } else {
      setStep(1);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength.score === 4) return "#16a34a";
    if (passwordStrength.score === 3) return "#f59e0b";
    if (passwordStrength.score === 2) return "#f97316";
    return "#ef4444";
  };

  const getStrengthText = () => {
    if (passwordStrength.score === 4) return "Fuerte";
    if (passwordStrength.score === 3) return "Media";
    if (passwordStrength.score === 2) return "Débil";
    return "Muy débil";
  };

  const isImpostor = registerType === "impostor";
  const primaryColor = isImpostor ? "#7c3aed" : "#004225";
  const primaryHover = isImpostor ? "#6d28d9" : "#063c22";

  // ==================== PANTALLA DE SELECCIÓN ====================
  if (registerType === null) {
    return (
      <>
        <HeaderSimplif />
        <main className="auth-wrap">
          <div className="auth-card register-selection-card">
            <div className="auth-head">
              <img
                src="/assets/logo.png"
                alt="La Otra Tribuna"
                className="auth-logo"
              />
              <h2 className="auth-title">Crear cuenta</h2>
              <p className="auth-subtitle">¿Cómo querés registrarte?</p>
            </div>

            <div className="register-options">
              {/* Opción Registro Completo */}
              <button
                type="button"
                className="register-option register-option--full"
                onClick={() => setRegisterType("full")}
              >
                <div className="register-option__icon register-option__icon--full">
                  <span>🛒</span>
                </div>
                <div className="register-option__content">
                  <h3 className="register-option__title">Registro completo</h3>
                  <p className="register-option__desc">
                    Accedé a todas las funciones: comprar, vender, publicar
                    camisetas y jugar al Impostor.
                  </p>
                  <div className="register-option__tags">
                    <span className="tag tag--green">Comprar</span>
                    <span className="tag tag--green">Vender</span>
                    <span className="tag tag--green">Publicar</span>
                    <span className="tag tag--green">Impostor</span>
                  </div>
                </div>
                <span className="register-option__arrow">→</span>
              </button>

              {/* Opción Registro Impostor */}
              <button
                type="button"
                className="register-option register-option--impostor"
                onClick={() => setRegisterType("impostor")}
              >
                <div className="register-option__icon register-option__icon--impostor">
                  <span>🎮</span>
                </div>
                <div className="register-option__content">
                  <h3 className="register-option__title">
                    Solo para jugar al Impostor
                  </h3>
                  <p className="register-option__desc">
                    Registro rápido solo para jugar. Después podés completar tu
                    perfil si querés comprar o vender.
                  </p>
                  <div className="register-option__tags">
                    <span className="tag tag--purple">⚡ Registro rápido</span>
                    <span className="tag tag--purple">Impostor</span>
                  </div>
                </div>
                <span className="register-option__arrow">→</span>
              </button>
            </div>

            <p className="auth-alt">
              ¿Ya tenés cuenta?{" "}
              <Link to="/login" className="auth-link">
                Iniciá sesión
              </Link>
            </p>
          </div>
        </main>
      </>
    );
  }

  // ==================== FORMULARIO DE REGISTRO ====================
  return (
    <>
      <HeaderSimplif />
      <main className="auth-wrap">
        <form
          className="auth-card"
          onSubmit={step === 1 ? handleNext : handleSubmit}
          noValidate
        >
          <div className="auth-head">
            <img
              src="/assets/logo.png"
              alt="La Otra Tribuna"
              className="auth-logo"
            />
            <h2 className="auth-title">
              {isImpostor ? "Registro Impostor 🎮" : "Crear cuenta"}
            </h2>
            <p className="auth-subtitle">
              {step === 1 ? "Datos personales" : "Dirección de entrega"}
            </p>
          </div>

          {/* Progress bar */}
          <div className="progress-bar">
            <div
              className="progress-bar__step"
              style={{ background: primaryColor }}
            />
            {!isImpostor && (
              <div
                className="progress-bar__step"
                style={{ background: step >= 2 ? primaryColor : "#e5e7eb" }}
              />
            )}
          </div>

          {/* ===== PASO 1 ===== */}
          {step === 1 && (
            <div className="auth-form">
              {/* Nombre */}
              <div className="field">
                <label className="field__label">Nombre *</label>
                <input
                  type="text"
                  className="field__input"
                  value={form.nombre}
                  onChange={update("nombre")}
                  placeholder="Juan"
                  required
                />
              </div>

              {/* Apellido */}
              <div className="field">
                <label className="field__label">Apellido *</label>
                <input
                  type="text"
                  className="field__input"
                  value={form.apellido}
                  onChange={update("apellido")}
                  placeholder="Pérez"
                  required
                />
              </div>

              {/* Email */}
              <div className="field">
                <label className="field__label">Email *</label>
                <input
                  type="email"
                  className="field__input"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="tu@email.com"
                  required
                />
              </div>

              {/* Contraseña */}
              <div className="field">
                <label className="field__label">Contraseña *</label>
                <div className="field__password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="field__input field__input--password"
                    value={form.password}
                    onChange={update("password")}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="field__toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                {form.password && (
                  <div className="password-strength">
                    <div className="password-strength__header">
                      <span>Fortaleza:</span>
                      <span style={{ color: getStrengthColor(), fontWeight: 600 }}>
                        {getStrengthText()}
                      </span>
                    </div>
                    <div className="password-strength__bar">
                      <div
                        className="password-strength__fill"
                        style={{
                          width: `${(passwordStrength.score / 4) * 100}%`,
                          background: getStrengthColor(),
                        }}
                      />
                    </div>
                    <div className="password-strength__requirements">
                      {[
                        { key: "length", text: "Mínimo 8 caracteres" },
                        { key: "uppercase", text: "Una letra mayúscula" },
                        { key: "number", text: "Un número" },
                        { key: "symbol", text: "Un símbolo especial (!@#$%^&*)" },
                      ].map(({ key, text }) => (
                        <div
                          key={key}
                          className={`requirement ${
                            passwordStrength[key] ? "requirement--met" : ""
                          }`}
                        >
                          <span>{passwordStrength[key] ? "✓" : "○"}</span>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="field">
                <label className="field__label">Confirmar contraseña *</label>
                <div className="field__password-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="field__input field__input--password"
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="field__toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {form.confirmPassword && (
                  <div
                    className={`password-match ${
                      form.password === form.confirmPassword
                        ? "password-match--success"
                        : "password-match--error"
                    }`}
                  >
                    <span>
                      {form.password === form.confirmPassword ? "✓" : "✕"}
                    </span>
                    <span>
                      {form.password === form.confirmPassword
                        ? "Las contraseñas coinciden"
                        : "Las contraseñas no coinciden"}
                    </span>
                  </div>
                )}
              </div>

              {/* Términos */}
              <label className="terms-checkbox">
                <input
                  type="checkbox"
                  checked={form.accept}
                  onChange={update("accept")}
                />
                <span>
                  Acepto los{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="terms-link"
                    style={{ color: primaryColor }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Términos y Condiciones
                  </a>{" "}
                  y la{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="terms-link"
                    style={{ color: primaryColor }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Política de Privacidad
                  </a>
                </span>
              </label>

              {/* Error */}
              {error && <div className="error-message">{error}</div>}

              {/* Botones */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleBack}
                >
                  ← Volver
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{
                    background:
                      checkingEmail || submitting ? "#9ca3af" : primaryColor,
                  }}
                  disabled={checkingEmail || submitting}
                >
                  {checkingEmail || submitting
                    ? "Procesando..."
                    : isImpostor
                    ? "Crear cuenta 🎮"
                    : "Continuar →"}
                </button>
              </div>

              <p className="auth-alt">
                ¿Ya tenés cuenta?{" "}
                <Link to="/login" className="auth-link" style={{ color: primaryColor }}>
                  Iniciá sesión
                </Link>
              </p>
            </div>
          )}

          {/* ===== PASO 2 ===== */}
          {step === 2 && (
            <div className="auth-form">
              {/* País */}
              <div className="field">
                <label className="field__label">País *</label>
                <select
                  className="field__input field__select"
                  value={form.pais}
                  onChange={update("pais")}
                >
                  <option>Uruguay</option>
                </select>
              </div>

              {/* Departamento */}
              <div className="field">
                <label className="field__label">Departamento *</label>
                <input
                  type="text"
                  className="field__input"
                  value={form.departamento}
                  onChange={update("departamento")}
                  placeholder="Montevideo"
                  required
                />
              </div>

              {/* Ciudad */}
              <div className="field">
                <label className="field__label">Ciudad *</label>
                <input
                  type="text"
                  className="field__input"
                  value={form.ciudad}
                  onChange={update("ciudad")}
                  placeholder="Montevideo"
                  required
                />
              </div>

              {/* Dirección */}
              <div className="field">
                <label className="field__label">Dirección *</label>
                <input
                  type="text"
                  className="field__input"
                  value={form.direccion}
                  onChange={update("direccion")}
                  placeholder="Av. 18 de Julio 1234"
                  required
                />
              </div>

              {/* Código postal */}
              <div className="field">
                <label className="field__label">Código postal *</label>
                <input
                  type="text"
                  className="field__input"
                  value={form.cp}
                  onChange={update("cp")}
                  placeholder="11200"
                  maxLength="5"
                  required
                />
              </div>

              {/* Error */}
              {error && <div className="error-message">{error}</div>}

              {/* Botones */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  ← Volver
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{ background: submitting ? "#9ca3af" : primaryColor }}
                  disabled={submitting}
                >
                  {submitting ? "Creando cuenta..." : "Crear cuenta ✓"}
                </button>
              </div>

              <p className="auth-alt">
                ¿Ya tenés cuenta?{" "}
                <Link to="/login" className="auth-link" style={{ color: primaryColor }}>
                  Iniciá sesión
                </Link>
              </p>
            </div>
          )}
        </form>
      </main>

      {/* ===== OVERLAY ===== */}
      {overlay.open &&
        createPortal(
          <div
            className="overlay-backdrop"
            onClick={() => setOverlay((o) => ({ ...o, open: false }))}
          >
            <div
              className="overlay-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="overlay-card__icon">
                {overlay.type === "error" ? "❌" : "✅"}
              </div>
              <h3 className="overlay-card__title">{overlay.title}</h3>
              <p className="overlay-card__text">{overlay.text}</p>
              <button
                className="overlay-card__btn"
                style={{
                  background: overlay.type === "error" ? "#ef4444" : "#16a34a",
                }}
                onClick={() => setOverlay((o) => ({ ...o, open: false }))}
              >
                Cerrar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}