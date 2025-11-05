import React from "react";
import "./Terms.css";

export default function Terms() {
  return (
    <div className="terms-container">
      <h1>Términos y Condiciones</h1>
      <p className="terms-date">Fecha de última actualización: 2025-11-05</p>

      <h3>1. Aceptación</h3>
      <p>
        Al crear una cuenta en <strong>La Otra Tribuna</strong> aceptás estos Términos y nuestra
        Declaración de Privacidad. Si no estás de acuerdo, no utilices el servicio.
      </p>

      <h3>2. Cuenta</h3>
      <ul>
        <li>Sos responsable de la confidencialidad de tus credenciales.</li>
        <li>Debés proporcionar información veraz y mantenerla actualizada.</li>
        <li>
          Para operar como comprador o vendedor, puede solicitarse verificación de identidad
          mediante documento.
        </li>
        <li>Podemos suspender cuentas por uso indebido, fraude o incumplimientos.</li>
      </ul>

      <h3>3. Publicaciones y ventas</h3>
      <ul>
        <li>
          Las publicaciones deben describir con precisión el producto, su estado y si es{" "}
          <strong>original</strong> o <strong>réplica</strong>.
        </li>
        <li>Prohibido publicar contenido ilícito, engañoso o que infrinja derechos de terceros.</li>
        <li>Las publicaciones mal clasificadas pueden ser pausadas o removidas.</li>
        <li>La plataforma puede cobrar comisiones, informadas antes de confirmar la operación.</li>
      </ul>

      <h3>4. Pagos y envíos</h3>
      <ul>
        <li>Los pagos se procesan a través de intermediarios seguros.</li>
        <li>
          El dinero queda retenido hasta que el comprador confirma recepción o hasta el vencimiento
          del plazo de revisión establecido.
        </li>
        <li>
          Los envíos se realizan por servicios de paquetería externos; la plataforma no es
          responsable por demoras o daños atribuibles al operador logístico.
        </li>
      </ul>

      <h3>5. Protección al comprador</h3>
      <ul>
        <li>
          Si el producto recibido <strong>no coincide</strong> con lo publicado, podés solicitar{" "}
          <strong>devolución</strong> dentro del plazo indicado en la sección de Ayuda.
        </li>
        <li>
          Los reclamos deben iniciarse por los canales oficiales de la plataforma y dentro del
          plazo correspondiente.
        </li>
      </ul>

      <h3>6. Responsabilidad</h3>
      <p>
        El uso del sitio es bajo tu propio riesgo. La plataforma no es responsable de daños
        indirectos, pérdidas económicas o perjuicios derivados del uso del servicio.
      </p>

      <h3>7. Propiedad intelectual</h3>
      <p>
        Las marcas, logos e interfaces del sitio son propiedad de sus respectivos titulares. No se
        otorgan licencias implícitas.
      </p>

      <h3>8. Cambios</h3>
      <p>
        Podemos modificar estos Términos. La versión vigente se publica en este mismo enlace.
      </p>

      <h3>9. Contacto</h3>
      <p>
        Consultas legales:{" "}
        <a href="mailto:soporte@laotratribuna.com">soporte@laotratribuna.com</a>
      </p>
    </div>
  );
}