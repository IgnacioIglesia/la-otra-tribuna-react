import React, { useState } from "react";
import "./Help.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";

export default function Help() {
  const [form, setForm] = useState({
    email: "",
    orderId: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    if (!form.email.trim()) return "Ingresá tu email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Ingresá un email válido.";
    if (!form.message.trim()) return "Contanos qué ocurrió.";
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) return setError(msg);

    setError("");
    setSending(true);

    // TODO: enviar a tu backend o servicio de soporte
    setTimeout(() => {
      setSending(false);
      setOk(true);
      setForm({ email: "", orderId: "", message: "" });
    }, 900);
  };

  return (
    <>
      <HeaderSimplif />
      <main className="help-wrap">
        <form className="help-card" onSubmit={handleSubmit} noValidate>
          <div className="help-head">
            <img src="/assets/logo.png" alt="La Otra Tribuna" />
            <h2>Ayuda</h2>
          </div>

          <div className="help-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="Tu email"
                value={form.email}
                onChange={update("email")}
                required
              />
            </label>

            <label className="field">
              <span>N.º de pedido (opcional)</span>
              <input
                type="text"
                placeholder="Ej: ABC123456UY"
                value={form.orderId}
                onChange={update("orderId")}
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
                ¡Gracias! Recibimos tu consulta y te vamos a responder a la
                brevedad.
              </div>
            )}

            <button className="btn btn-primary" disabled={sending} type="submit">
              {sending ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}