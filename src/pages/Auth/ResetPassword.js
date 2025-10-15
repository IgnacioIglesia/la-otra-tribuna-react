import React, { useEffect, useState } from "react";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";
import "./AuthShared.css";

export default function ResetPassword() {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [ready, setReady] = useState(false);

  // Cuando el usuario llega desde el mail, Supabase abre una sesión temporal.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setReady(!!session);
      if (!session) {
        setMsg({
          type: "error",
          text: "El enlace no es válido o expiró. Pedí uno nuevo.",
        });
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pw1 || pw1.length < 6) {
      setMsg({ type: "error", text: "La nueva contraseña debe tener al menos 6 caracteres." });
      return;
    }
    if (pw1 !== pw2) {
      setMsg({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    setWorking(true);
    setMsg({ type: "", text: "" });
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) {
        setMsg({ type: "error", text: error.message || "No se pudo actualizar la contraseña." });
        return;
      }
      setMsg({
        type: "ok",
        text: "¡Listo! Tu contraseña fue actualizada. Ya podés iniciar sesión.",
      });
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Error inesperado." });
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <HeaderSimplif />
      <main className="auth-wrap">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-head" style={{ textAlign: "center" }}>
            <img src="/assets/logo.png" alt="La Otra Tribuna" className="auth-logo" />
            <h2 className="auth-title">Restablecer contraseña</h2>
          </div>

          <div className="auth-body auth-form">
            {!ready ? (
              <p className="err">
                {msg.text || "Verificando enlace…"}
              </p>
            ) : (
              <>
                <div className="field">
                  <span>Nueva contraseña</span>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <span>Repetir contraseña</span>
                  <input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    required
                  />
                </div>

                {msg.text && (
                  <div className={msg.type === "error" ? "err" : "ok"}>{msg.text}</div>
                )}

                <button type="submit" className="btn btn-primary" disabled={working}>
                  {working ? "Guardando…" : "Actualizar contraseña"}
                </button>

                <p className="auth-alt">
                  <a href="/login">Volver a iniciar sesión</a>
                </p>
              </>
            )}
          </div>
        </form>
      </main>
    </>
  );
}