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
              Cómo verificamos, qué te pedimos al publicar y qué cobertura tenés
              como comprador.
            </p>
          </header>

          <section className="authn-section">
            <h3>¿Cómo verificamos una camiseta?</h3>
            <ul>
              <li>
                <strong>Fotos obligatorias:</strong> frontal, dorsal, etiqueta
                interna, holograma o patch, detalle de sponsors.
              </li>
              <li>
                <strong>Detalles de fabricación:</strong> tipo de tejido,
                costuras, tipografías, escudos y parches.
              </li>
              <li>
                <strong>Coincidencia temporada/modelo:</strong> contrastamos con
                catálogos oficiales y referencias públicas.
              </li>
              <li>
                <strong>Revisión comunitaria:</strong> los usuarios pueden
                reportar dudas; nuestro equipo revisa en 24–48 h.
              </li>
            </ul>
          </section>

          <section className="authn-section">
            <h3>Política de réplicas</h3>
            <ul>
              <li>
                Se permiten <strong>réplicas</strong> siempre que estén{" "}
                <strong>marcadas</strong> como tal al publicar.
              </li>
              <li>
                Las publicaciones mal clasificadas pueden ser pausadas o
                removidas.
              </li>
            </ul>
          </section>

          <section className="authn-section">
            <h3>Protección al comprador</h3>
            <ul>
              <li>
                Si el ítem recibido <strong>no coincide</strong> con lo
                publicado, podés solicitar <strong>devolución</strong>.
              </li>
              <li>
                Pagos procesados con intermediarios seguros y{" "}
                <strong>liberación</strong> al vendedor cuando confirmás
                recepción.
              </li>
            </ul>
          </section>

          <section className="authn-section">
            <h3>Consejos rápidos para publicar</h3>
            <ul>
              <li>Fotos con buena luz, fondo neutro, sin filtros.</li>
              <li>
                Mostrá número de serie/holograma (si lo tuviera) y estado real
                (manchas, roturas, desgaste).
              </li>
              <li>
                Especificá <strong>talle, medidas</strong> y si es{" "}
                <strong>jugador o fan</strong>.
              </li>
            </ul>
          </section>
        </article>
      </main>
    </>
  );
}