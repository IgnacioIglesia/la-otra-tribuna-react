import React from "react";
import "./HowItWorks.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";

export default function HowItWorks() {
  return (
    <>
      <HeaderSimplif />

      <main className="how-wrap">
        <article className="how-card">
          <header className="how-header">
            <h1>Cómo funciona</h1>
            <p className="lead">
              Publicar, comprar y vender camisetas entre hinchas — simple y seguro.
            </p>
          </header>

          <section className="how-section">
            <h3>1) Publicá</h3>
            <ul>
              <li>
                Entrá a <a href="/sell">Vender</a> y completá título, fotos, categoría
                (Club / Selección / Retro), talle, estado y precio.
              </li>
              <li>
                Indicá si es <strong>original</strong> o <strong>réplica</strong> (ver{" "}
                <a href="/authenticity">Autenticidad</a>).
              </li>
            </ul>
          </section>

          <section className="how-section">
            <h3>2) Comprá</h3>
            <ul>
              <li>Filtrá por club, país, categoría y precio.</li>
              <li>
                Agregá a <a href="/favorites">Favoritos</a> para seguir un producto y
                recibir actualizaciones.
              </li>
              <li>
                Pagá con métodos seguros. El pago se libera al vendedor cuando confirmás recepción.
              </li>
            </ul>
          </section>

          <section className="how-section">
            <h3>3) Envíos & seguimiento</h3>
            <ul>
              <li>Revisá costos/tiempos según tu ubicación.</li>
              <li>
                Seguimiento desde <a href="/track-order">Rastrear Pedido</a>.
              </li>
            </ul>
          </section>

          <section className="how-section">
            <h3>Reputación y preguntas</h3>
            <ul>
              <li>
                Calificaciones y comentarios ayudan a la confianza de la comunidad.
              </li>
              <li>
                Usá el chat/preguntas para dudas sobre talle, medidas y estado.
              </li>
            </ul>
          </section>

          <section className="how-section">
            <h3>Tarifas</h3>
            <ul>
              <li>
                Publicar: <strong>gratis</strong>.
              </li>
              <li>
                Comisión por venta (si aplica): se muestra antes de confirmar.
              </li>
            </ul>
          </section>
        </article>
      </main>
    </>
  );
}