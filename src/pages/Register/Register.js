import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
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
    symbol: false,
    score: 0
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

    // Validar contraseña en tiempo real
    if (k === "password") {
      validatePasswordStrength(v);
    }
  };

  // Validación de fortaleza de contraseña
  const validatePasswordStrength = (pwd) => {
    const strength = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      score: 0
    };

    strength.score = [strength.length, strength.uppercase, strength.symbol].filter(Boolean).length;
    setPasswordStrength(strength);
  };

  // Validaciones mejoradas
  const validateStep1 = () => {
    if (!form.nombre.trim()) return "Por favor, ingresá tu nombre.";
    if (form.nombre.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
    
    if (!form.apellido.trim()) return "Por favor, ingresá tu apellido.";
    if (form.apellido.trim().length < 2) return "El apellido debe tener al menos 2 caracteres.";
    
    if (!form.email.trim()) return "Por favor, ingresá tu email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Por favor, ingresá un email válido.";
    
    if (!form.password) return "Por favor, ingresá una contraseña.";
    if (form.password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(form.password))
      return "La contraseña debe incluir al menos una letra mayúscula.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password))
      return "La contraseña debe incluir al menos un símbolo especial.";
    
    if (!form.accept) 
      return "Debes aceptar los Términos y Condiciones para continuar.";
    
    return null;
  };

  const validateStep2 = () => {
    if (!form.pais.trim()) return "Por favor, seleccioná un país.";
    if (!form.departamento.trim()) return "Por favor, ingresá tu departamento.";
    if (!form.ciudad.trim()) return "Por favor, ingresá tu ciudad.";
    if (!form.direccion.trim()) return "Por favor, ingresá tu dirección.";
    if (!form.cp.trim()) return "Por favor, ingresá tu código postal.";
    if (!/^\d{5}$/.test(form.cp.trim())) return "El código postal debe tener 5 dígitos.";
    return null;
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
        console.warn("RPC email_existe falló, se continúa igual:", rpcErr);
        setStep(2);
        return;
      }
      if (data === true) {
        setError("Este email ya está registrado. Por favor, iniciá sesión.");
        return;
      }
      setStep(2);
    } catch (err) {
      console.warn(err);
      setStep(2);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleBack = (e) => {
    e.preventDefault();
    setError("");
    setStep(1);
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
          },
        },
      });

      if (signErr) {
        console.error("signUp error:", signErr);
        const already = /already.*registered|exists/i.test(signErr.message || "");
        setOverlay({
          open: true,
          type: "error",
          title: already ? "Email ya registrado" : "No se pudo crear la cuenta",
          text: already
            ? "Ese email ya está registrado. Por favor, iniciá sesión."
            : signErr.message || "Ocurrió un error. Por favor, intentá nuevamente.",
        });
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        setOverlay({
          open: true,
          type: "ok",
          title: "¡Revisá tu correo! 📧",
          text:
            "Te enviamos un email de confirmación. Revisá tu bandeja de entrada y spam.",
        });
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      setOverlay({
        open: true,
        type: "ok",
        title: "¡Cuenta creada exitosamente! 🎉",
        text: "Tu cuenta se creó correctamente. Redirigiendo al inicio...",
      });
      setTimeout(() => navigate("/"), 1500);
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

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score === 3) return "#16a34a";
    if (passwordStrength.score === 2) return "#f59e0b";
    return "#ef4444";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score === 3) return "Fuerte";
    if (passwordStrength.score === 2) return "Media";
    if (passwordStrength.score === 1) return "Débil";
    return "Muy débil";
  };

  return (
    <>
      <HeaderSimplif />

      <main className="auth-wrap">
        <form
          className="auth-card"
          onSubmit={step === 1 ? handleNext : handleSubmit}
          noValidate
          style={{ maxWidth: "480px" }}
        >
          <div className="auth-head" style={{ textAlign: "center", marginBottom: "2rem" }}>
            <img 
              src="/assets/logo.png" 
              alt="La Otra Tribuna" 
              className="auth-logo"
              style={{ maxWidth: "120px", marginBottom: "1rem" }}
            />
            <h2 className="auth-title" style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
              Crear cuenta
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
              {step === 1 ? "Datos personales" : "Dirección de entrega"}
            </p>
          </div>

          {/* Indicador de pasos */}
          <div style={{ 
            display: "flex", 
            gap: "0.5rem", 
            marginBottom: "2rem",
            justifyContent: "center"
          }}>
            <div style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: step >= 1 ? "#004225" : "#e5e7eb"
            }} />
            <div style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: step >= 2 ? "#004225" : "#e5e7eb"
            }} />
          </div>

          {step === 1 && (
            <div className="auth-body auth-form">
              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Nombre *
                </label>
                <input 
                  type="text" 
                  value={form.nombre} 
                  onChange={update("nombre")} 
                  placeholder="Juan"
                  required 
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    width: "100%",
                    transition: "all 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Apellido *
                </label>
                <input 
                  type="text" 
                  value={form.apellido} 
                  onChange={update("apellido")} 
                  placeholder="Pérez"
                  required 
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    width: "100%",
                    transition: "all 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Email *
                </label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={update("email")} 
                  placeholder="tu@email.com"
                  required 
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    width: "100%",
                    transition: "all 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Contraseña *
                </label>
                <div style={{ position: "relative" }}>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={form.password} 
                    onChange={update("password")} 
                    placeholder="••••••••"
                    required 
                    style={{
                      padding: "0.75rem 1rem",
                      paddingRight: "3rem",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "1rem",
                      width: "100%",
                      transition: "all 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "1.25rem",
                      color: "#6b7280"
                    }}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>

                {/* Indicador de fortaleza */}
                {form.password && (
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
                        width: `${(passwordStrength.score / 3) * 100}%`,
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

              <label style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px",
                cursor: "pointer",
                marginTop: "0.5rem"
              }}>
                <input 
                  type="checkbox" 
                  checked={form.accept} 
                  onChange={update("accept")}
                  style={{ 
                    marginTop: "0.25rem",
                    width: "18px",
                    height: "18px",
                    cursor: "pointer"
                  }}
                />
                <span style={{ fontSize: "0.9rem", color: "#004225", lineHeight: "1.5" }}>
                  Acepto los{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}   // ← no altera el checkbox
                    style={{ color: "#004225", textDecoration: "underline", fontWeight: 600 }}
                  >
                    Términos y Condiciones
                  </a>{" "}
                  y la{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}   // ← no altera el checkbox
                    style={{ color: "#004225", textDecoration: "underline", fontWeight: 600 }}
                  >
                    Política de Privacidad
                  </a>
                </span>
              </label>

              {error && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: "0.9rem",
                  marginTop: "1rem"
                }}>
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={checkingEmail}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  background: checkingEmail ? "#9ca3af" : "#004225",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: checkingEmail ? "not-allowed" : "pointer",
                  marginTop: "1.5rem",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => !checkingEmail && (e.target.style.background = "#063c22")}
                onMouseOut={(e) => !checkingEmail && (e.target.style.background = "#004225")}
              >
                {checkingEmail ? "Verificando..." : "Continuar →"}
              </button>

              <p style={{ 
                textAlign: "center", 
                marginTop: "1.5rem", 
                color: "#6b7280",
                fontSize: "0.95rem"
              }}>
                ¿Ya tenés cuenta? <Link to="/login" style={{ color: "#004225", textDecoration: "none", fontWeight: 600 }}>Iniciá sesión</Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="auth-body auth-form">
              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  País *
                </label>
                <select 
                  value={form.pais} 
                  onChange={update("pais")}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    width: "100%",
                    background: "white",
                    cursor: "pointer"
                  }}
                >
                  <option>Uruguay</option>
                </select>
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Departamento *
                </label>
                <input 
                  type="text" 
                  value={form.departamento} 
                  onChange={update("departamento")} 
                  placeholder="Montevideo"
                  required 
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    width: "100%"
                  }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Ciudad *
                </label>
                <input 
                  type="text" 
                  value={form.ciudad} 
                  onChange={update("ciudad")} 
                  placeholder="Montevideo"
                  required 
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    width: "100%"
                  }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Dirección *
                </label>
                <input 
                  type="text" 
                  value={form.direccion} 
                  onChange={update("direccion")} 
                  placeholder="Av. 18 de Julio 1234"
                  required 
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    width: "100%"
                  }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Código postal *
                </label>
                <input 
                  type="text" 
                  value={form.cp} 
                  onChange={update("cp")} 
                  placeholder="11200"
                  maxLength="5"
                  required 
                  style={{
                    padding: "0.75rem 1rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    width: "100%"
                  }}
                />
              </div>

              {error && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: "0.9rem",
                  marginTop: "1rem"
                }}>
                  {error}
                </div>
              )}

              <div style={{ 
                display: "flex", 
                gap: "1rem", 
                marginTop: "1.5rem" 
              }}>
                <button 
                  type="button"
                  onClick={handleBack} 
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background: "white",
                    color: "#374151",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer"
                  }}
                >
                  ← Volver
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: "0.875rem",
                    background: submitting ? "#9ca3af" : "#004225",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => !submitting && (e.target.style.background = "#063c22")}
                  onMouseOut={(e)  => !submitting && (e.target.style.background = "#004225")}
                >
                  {submitting ? "Creando cuenta..." : "Crear cuenta ✓"}
                </button>
              </div>

              <p style={{ 
                textAlign: "center", 
                marginTop: "1.5rem", 
                color: "#6b7280",
                fontSize: "0.95rem"
              }}>
                ¿Ya tenés cuenta? <Link to="/login" style={{ color: "#004225", textDecoration: "none", fontWeight: 600 }}>Iniciá sesión</Link>
              </p>
            </div>
          )}
        </form>
      </main>

      {overlay.open &&
        createPortal(
          <div 
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "grid",
              placeItems: "center",
              zIndex: 9999,
              padding: "1rem"
            }}
            onClick={() => setOverlay((o) => ({ ...o, open: false }))}
          >
            <div 
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "2rem",
                maxWidth: "400px",
                width: "100%",
                textAlign: "center",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
                {overlay.type === "error" ? "❌" : "✅"}
              </div>
              <h3 style={{ 
                fontSize: "1.5rem", 
                fontWeight: 700, 
                color: "#111827",
                marginBottom: "0.75rem"
              }}>
                {overlay.title || (overlay.type === "error" ? "Error" : "¡Listo!")}
              </h3>
              <p style={{ 
                color: "#6b7280", 
                lineHeight: "1.6",
                marginBottom: "1.5rem"
              }}>
                {overlay.text || "Operación realizada."}
              </p>
              <button
                onClick={() => setOverlay((o) => ({ ...o, open: false }))}
                style={{
                  padding: "0.75rem 2rem",
                  background: overlay.type === "error" ? "#ef4444" : "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
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