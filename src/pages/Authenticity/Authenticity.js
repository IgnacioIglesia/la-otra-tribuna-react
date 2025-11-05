import React from "react";
import "./Authenticity.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";

export default function Authenticity() {
  return (
    <>
      <HeaderSimplif />

      <main className="authn-wrap">
        <article className="authn-card">
          <header className="authn-header">
            <h1>Autenticidad & Garantía</h1>
            <p className="lead">
              Cómo se publica, qué control aplica La Otra Tribuna y qué cobertura
              tenés como comprador.
            </p>
          </header>

          <section className="authn-section">
            <h3>¿Qué control hacemos sobre las publicaciones?</h3>
            <ul>
              <li>
                <strong>Foto obligatoria:</strong> una sola foto que muestre la
                camiseta completa, con buena luz y fondo neutro, sin filtros.
              </li>
              <li>
                <strong>Datos claros al publicar:</strong> el vendedor debe indicar
                si la camiseta es <strong>original</strong> o <strong>réplica</strong>,
                y describir el estado real de la prenda.
              </li>
              <li>
                <strong>Usuarios verificados:</strong> para publicar o comprar se
                requiere registro con <strong>email</strong> y{" "}
                <strong>cédula</strong>, lo que aporta trazabilidad y mayor
                seguridad.
              </li>
              <li>
                <strong>Control del equipo:</strong> si detectamos imágenes falsas,
                robadas o publicaciones mal clasificadas (por ejemplo, réplica como
                original), podemos <strong>corregir</strong>,{" "}
                <strong>pausar</strong> o <strong>dar de baja</strong> la
                publicación.
              </li>
            </ul>
          </section>

          <section className="authn-section">
            <h3>Política de réplicas</h3>
            <ul>
              <li>
                Se permiten <strong>réplicas</strong> siempre que estén{" "}
                <strong>claramente indicadas</strong> como tales al publicar.
              </li>
              <li>
                Las publicaciones mal clasificadas pueden ser <strong>pausadas</strong>{" "}
                o <strong>removidas</strong>.
              </li>
            </ul>
          </section>

          <section className="authn-section">
            <h3>Protección al comprador</h3>
            <ul>
              <li>
                Si lo recibido <strong>no coincide</strong> con lo publicado (estado,
                talle, modelo, original vs réplica), podés solicitar{" "}
                <strong>revisión y posible devolución</strong> dentro del plazo
                establecido.
              </li>
              <li>
                Pagos procesados con intermediarios seguros y{" "}
                <strong>liberación</strong> al vendedor cuando confirmás recepción.
              </li>
            </ul>
          </section>

          <section className="authn-section">
            <h3>Consejos rápidos para publicar</h3>
            <ul>
              <li>
                Subí <strong>una foto</strong> con buena luz que muestre la prenda
                completa.
              </li>
              <li>
                Describí con honestidad el <strong>estado real</strong> (desgaste,
                manchas, roturas o detalles).
              </li>
              <li>
                Especificá <strong>talle</strong>, <strong>medidas</strong> y si es{" "}
                <strong>jugador</strong> o <strong>fan</strong> (si aplica).
              </li>
            </ul>
          </section>
        </article>
      </main>
    </>
  );
}