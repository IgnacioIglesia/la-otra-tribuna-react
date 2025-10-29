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
                Entrá a <a href="/sell">Vender</a> y completá título, fotos, tipo (Club o Selección), categoría (Retro o Actual), talle, estado y precio.
              </li>
              <li>
                Indicá si la camiseta es <strong>original</strong> o <strong>réplica</strong> para mayor claridad entre usuarios.
              </li>
            </ul>
          </section>

          <section className="how-section">
            <h3>2) Comprá</h3>
            <ul>
              <li>Usá los filtros para buscar por club, país, tipo, categoría, talle y precio.</li>
              <li>
                Podés agregar productos a <a href="/favorites">Favoritos</a> para verlos más tarde.
              </li>
              <li>
                Realizá el pago dentro de la plataforma. El dinero queda retenido hasta que recibís la camiseta y confirmás que está todo bien.
              </li>
            </ul>
          </section>

          <section className="how-section">
            <h3>3) Envío y confirmación</h3>
            <ul>
              <li>El vendedor realiza el envío dentro de Uruguay.</li>
              <li>
                Podés seguir el estado desde <a href="/track-order">Rastrear Pedido</a>.
              </li>
              <li>
                Tenés hasta 15 días corridos para reportar cualquier inconveniente.
                Si confirmás la recepción, o si pasa el plazo sin reclamos, el pago se acredita al vendedor.
              </li>
            </ul>
          </section>

          <section className="how-section">
            <h3>Tarifas</h3>
            <ul>
              <li>
                Publicar es <strong>gratis</strong>.
              </li>
              <li>
                Por cada venta realizada, se descuenta una comisión del <strong>7%</strong> al vendedor.
              </li>
            </ul>
          </section>
        </article>
      </main>
    </>
  );
}