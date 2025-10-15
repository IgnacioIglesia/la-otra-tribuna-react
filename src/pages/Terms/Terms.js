import React from "react";
import "./Terms.css";

export default function Terms() {
  return (
    <div className="terms-container">
      <h1>Términos y Condiciones</h1>
      <p className="terms-date">Fecha de última actualización: 2025-09-29</p>

      <h3>1. Aceptación</h3>
      <p>
        Al crear una cuenta en <strong>La Otra Tribuna</strong> aceptás estos Términos y nuestra
        Declaración de Privacidad. Si no estás de acuerdo, no utilices el servicio.
      </p>

      <h3>2. Cuenta</h3>
      <ul>
        <li>Sos responsable de la confidencialidad de tus credenciales.</li>
        <li>Debés proporcionar información veraz y mantenerla actualizada.</li>
        <li>Podemos suspender cuentas por uso indebido o incumplimientos.</li>
      </ul>

      <h3>3. Publicaciones y ventas</h3>
      <ul>
        <li>Las publicaciones deben describir con precisión el producto, su estado y autenticidad.</li>
        <li>Prohibido publicar contenido ilícito, engañoso o que infrinja derechos de terceros.</li>
        <li>La plataforma puede cobrar comisiones, informadas antes de confirmar la operación.</li>
      </ul>

      <h3>4. Pagos y envíos</h3>
      <p>
        Los pagos se procesan a través de intermediarios seguros. El dinero se libera al vendedor
        cuando el comprador confirma recepción.
      </p>

      <h3>5. Responsabilidad</h3>
      <p>
        El uso del sitio es bajo tu propio riesgo. La plataforma no es responsable de daños indirectos
        o pérdidas derivadas del uso del servicio.
      </p>

      <h3>6. Propiedad intelectual</h3>
      <p>
        Las marcas, logos e interfaces del sitio son propiedad de sus respectivos titulares.
        No se otorgan licencias implícitas.
      </p>

      <h3>7. Cambios</h3>
      <p>
        Podemos modificar estos Términos. La versión vigente se publica en este mismo enlace.
      </p>

      <h3>8. Contacto</h3>
      <p>
        Consultas legales:{" "}
        <a href="mailto:soporte@laotratribuna.com">soporte@laotratribuna.com</a>
      </p>
    </div>
  );
}