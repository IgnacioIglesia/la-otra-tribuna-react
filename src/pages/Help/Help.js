import React, { useEffect, useState } from "react";
import "./Help.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";

export default function Help() {
  const [form, setForm] = useState({ orderId: "", message: "" });
  const [userEmail, setUserEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);

  // Traer email del usuario logueado
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error obteniendo usuario:", error.message);
        return;
      }
      if (data?.user?.email) setUserEmail(data.user.email);
    })();
  }, []);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    if (!userEmail) return "Iniciá sesión para enviar tu consulta.";
    if (!form.message.trim()) return "Contanos qué ocurrió.";
    if (form.message.trim().length < 10)
      return "El mensaje debe tener al menos 10 caracteres.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOk(false);

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setError("");
    setSending(true);

    try {
      // Insert simple en support_ticket
      const { error: insertError } = await supabase
        .from("support_ticket")
        .insert([
          {
            email: userEmail,
            order_code: form.orderId.trim() || null,
            message: form.message.trim(),
            source: "web",
          },
        ]);

      if (insertError) throw insertError;

      setOk(true);
      setForm({ orderId: "", message: "" });
    } catch (err) {
      console.error(err);
      setError(err.message || "No pudimos registrar tu solicitud.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <HeaderSimplif />
      <main className="help-wrap">
        <form className="help-card" onSubmit={handleSubmit} noValidate>
          <div className="help-head">
            <img src="/assets/logo.png" alt="La Otra Tribuna" />
            <h2>Ayuda</h2>
            <p className="help-sub">
              Contanos tu problema y lo revisamos. Guardamos tu mensaje en nuestro sistema.
            </p>
          </div>

          <div className="help-form">
            <div className="field">
              <span>Tu cuenta</span>
              <div className="readonly-email">
                {userEmail ? <strong>{userEmail}</strong> : <em>Cargando tu cuenta…</em>}
              </div>
            </div>

            <label className="field">
              <span>N.º de pedido (opcional)</span>
              <input
                type="text"
                placeholder="Ej: ABC123456UY"
                value={form.orderId}
                onChange={update("orderId")}
                autoComplete="off"
              />
            </label>

            <label className="field">
              <span>¿Qué ocurrió?</span>
              <textarea
                placeholder="Contanos el problema con el mayor detalle posible…"
                rows={6}
                value={form.message}
                onChange={update("message")}
                required
              />
            </label>

            {error && <div className="help-error">{error}</div>}
            {ok && (
              <div className="help-ok">
                ¡Gracias! Registramos tu consulta.
              </div>
            )}

            <button
              className="btn btn-primary"
              disabled={sending || !userEmail}
              type="submit"
            >
              {sending ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}