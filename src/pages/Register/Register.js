// src/pages/Register/Register.js
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1 = datos básicos, 2 = dirección
  const [step, setStep] = useState(1);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const [error, setError] = useState("");
  const [overlay, setOverlay] = useState({
    open: false,
    type: "ok", // ok | error
    title: "",
    text: "",
  });

  const update = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  // Validaciones
  const validateStep1 = () => {
    if (!form.nombre.trim()) return "Ingresá tu nombre.";
    if (!form.apellido.trim()) return "Ingresá tu apellido.";
    if (!form.email.trim()) return "Ingresá un email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Ingresá un email válido.";
    if (!form.password || form.password.length < 6)
      return "La contraseña debe tener al menos 6 caracteres.";
    if (!form.accept) return "Tenés que aceptar los Términos y la Privacidad.";
    return null;
  };
  const validateStep2 = () => {
    if (!form.pais.trim()) return "Seleccioná un país.";
    if (!form.departamento.trim()) return "Ingresá un departamento.";
    if (!form.ciudad.trim()) return "Ingresá una ciudad.";
    if (!form.direccion.trim()) return "Ingresá una dirección.";
    if (!form.cp.trim()) return "Ingresá un código postal.";
    return null;
  };

  // Paso 1 → Paso 2 (intenta RPC email_existe, pero si falla sigue igual)
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
        setError("Este email ya está registrado. Iniciá sesión.");
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

      const { data, error: signErr } = await supabase.auth.signUp({
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
            ? "Ese email ya está registrado. Iniciá sesión."
            : signErr.message || "Error desconocido.",
        });
        return;
      }

      // Si tenés confirmación por email activada, probablemente NO haya sesión
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        setOverlay({
          open: true,
          type: "ok",
          title: "¡Revisá tu correo!",
          text:
            "Te enviamos un email para confirmar la cuenta. Después iniciá sesión.",
        });
        setTimeout(() => navigate("/login"), 1500);
        return;
      }

      // Sesión inmediata (confirmación OFF)
      setOverlay({
        open: true,
        type: "ok",
        title: "¡Cuenta creada!",
        text: "Tu cuenta se creó correctamente. Redirigiendo…",
      });
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      console.error(err);
      setOverlay({
        open: true,
        type: "error",
        title: "Error inesperado",
        text: err?.message || "Ocurrió un error inesperado.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeaderSimplif />

      <main className="auth-wrap">
        <form
          className="auth-card"
          onSubmit={step === 1 ? handleNext : handleSubmit}
          noValidate
        >
          <div className="auth-head" style={{ textAlign: "center" }}>
            <img src="/assets/logo.png" alt="La Otra Tribuna" className="auth-logo" />
            <h2 className="auth-title">Registrarse</h2>
          </div>

          {step === 1 && (
            <div className="auth-body auth-form">
              <div className="field">
                <span>Nombre</span>
                <input type="text" value={form.nombre} onChange={update("nombre")} required />
              </div>
              <div className="field">
                <span>Apellido</span>
                <input type="text" value={form.apellido} onChange={update("apellido")} required />
              </div>
              <div className="field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={update("email")} required />
              </div>
              <div className="field">
                <span>Contraseña</span>
                <input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={update("password")} required />
              </div>

              <label className="terms">
                <input type="checkbox" checked={form.accept} onChange={update("accept")} style={{ marginRight: 8 }} />
                Acepto los <Link to="/terms">Términos</Link> y la <Link to="/privacy">Privacidad</Link>.
              </label>

              {error && <div className="err">{error}</div>}

              <button type="submit" className="btn btn-primary" disabled={checkingEmail}>
                {checkingEmail ? "Verificando…" : "Continuar"}
              </button>

              <p className="auth-alt">
                ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="auth-body auth-form">
              <div className="field">
                <span>País</span>
                <select value={form.pais} onChange={update("pais")}><option>Uruguay</option></select>
              </div>
              <div className="field">
                <span>Departamento</span>
                <input type="text" value={form.departamento} onChange={update("departamento")} required />
              </div>
              <div className="field">
                <span>Ciudad</span>
                <input type="text" value={form.ciudad} onChange={update("ciudad")} required />
              </div>
              <div className="field">
                <span>Dirección</span>
                <input type="text" value={form.direccion} onChange={update("direccion")} required />
              </div>
              <div className="field">
                <span>Código postal</span>
                <input type="text" value={form.cp} onChange={update("cp")} required />
              </div>

              {error && <div className="err">{error}</div>}

              <div className="actions-row">
                <button className="btn btn-ghost" onClick={handleBack} disabled={submitting}>Volver</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Creando…" : "Crear cuenta"}
                </button>
              </div>

              <p className="auth-alt">
                ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
              </p>
            </div>
          )}
        </form>
      </main>

      {overlay.open &&
        createPortal(
          <div className="success-overlay" onClick={() => setOverlay((o) => ({ ...o, open: false }))}>
            <div className="success-card" onClick={(e) => e.stopPropagation()}>
              <div className="success-icon-wrap" aria-hidden="true">
                {overlay.type === "error" ? (
                  <svg className="success-icon" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" stroke="#ef4444" strokeWidth="1.5" fill="#ef444422" />
                    <path d="M8 8l8 8M16 8l-8 8" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="success-icon" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" stroke="#16a34a" strokeWidth="1.5" fill="#22c55e22" />
                    <path d="M7 12.5l3.2 3.2L17 9" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="success-title">{overlay.title || (overlay.type === "error" ? "Error" : "Listo")}</div>
              <div className="success-text">{overlay.text || "Operación realizada."}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}