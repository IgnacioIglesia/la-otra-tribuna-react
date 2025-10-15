import React, { useState } from "react";
import "./TrackOrder.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";

export default function TrackOrder() {
  const [code, setCode] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    console.log("Rastrear:", code);
  };

  return (
    <>
      <HeaderSimplif/>

      {/* Fondo aplicado inline desde React */}
      <section
        className="track-wrap"
        style={{
          backgroundImage: "url(/assets/pedido.png)",
          backgroundPosition: "center 50%",
          backgroundSize: "1640px auto",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#f6f7f9",
        }}
      >
        {/* Velo aclarado sobre la imagen */}
        <div className="bg-overlay" />

        {/* Tarjeta */}
        <form className="track-card" onSubmit={onSubmit} noValidate>
          <div className="card-head">
            <img
              src="/assets/imagen.png"   // 👈 logo de la tarjeta
              alt="La Otra Tribuna"
              className="brand"
            />
            <h2>Rastrear Pedido</h2>
          </div>

          <div className="field">
            <label htmlFor="track">Número de seguimiento</label>
            <input
              id="track"
              type="text"
              placeholder="Ej: ABC123456UY"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <button className="btn primary" type="submit">
            Rastrear
          </button>

          <p className="hint">
            Ingresá el código que te enviamos por correo o en la sección de tus
            pedidos.
          </p>
        </form>
      </section>
    </>
  );
}