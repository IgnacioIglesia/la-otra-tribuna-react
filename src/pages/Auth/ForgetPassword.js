import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";
import "./AuthShared.css"; // opcional, ver estilos más abajo

export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setMsg({ type: "error", text: "Ingresá tu email." });
      return;
    }
    setSending(true);
    setMsg({ type: "", text: "" });

    try {
      const redirectTo =
        window.location.origin + "/reset-password" + (location.search || "");

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );

      if (error) {
        setMsg({ type: "error", text: error.message || "No se pudo enviar el correo." });
        return;
      }
      setMsg({
        type: "ok",
        text: "Te enviamos un correo con el enlace para restablecer tu contraseña.",
      });
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Error inesperado." });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <HeaderSimplif />
      <main className="auth-wrap">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-head" style={{ textAlign: "center" }}>
            <img src="/assets/logo.png" alt="La Otra Tribuna" className="auth-logo" />
            <h2 className="auth-title">Recuperar contraseña</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Ingresá tu email y te enviaremos un enlace para restablecerla.
            </p>
          </div>

          <div className="auth-body auth-form">
            <div className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {msg.text && (
              <div className={msg.type === "error" ? "err" : "ok"}>{msg.text}</div>
            )}

            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? "Enviando…" : "Enviar enlace"}
            </button>

            <p className="auth-alt">
              ¿Recordaste tu clave? <a href="/login">Iniciá sesión</a>
            </p>
          </div>
        </form>
      </main>
    </>
  );
}