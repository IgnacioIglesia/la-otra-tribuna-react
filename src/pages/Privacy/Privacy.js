import React from "react";
import "./Privacy.css";

export default function Privacy() {
  return (
    <div className="terms-container">
      <h1>Declaración de Privacidad</h1>
      <p className="terms-date">
        Fecha de última actualización: 2025-11-05
      </p>

      <p>Cómo recopilamos, usamos y protegemos tu información personal.</p>

      <h3>1. Datos que recopilamos</h3>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, apellido, email, contraseña (encriptada),
          país/ciudad. Para operar como comprador o vendedor puede solicitarse verificación
          mediante imagen de documento de identidad.
        </li>
        <li>
          <strong>Datos de uso:</strong> logs, dispositivo, IP, páginas visitadas, interacción con la plataforma.
        </li>
        <li>
          <strong>Datos de transacción:</strong> publicaciones, compras, reclamos, historial de pagos y envíos.
        </li>
      </ul>

      <h3>2. Para qué los usamos</h3>
      <ul>
        <li>Operar el servicio (registro, login, publicaciones, compras, pagos y envíos).</li>
        <li>Verificación de identidad, seguridad y prevención de fraude.</li>
        <li>Cumplimiento de obligaciones legales y requerimientos regulatorios.</li>
        <li>Atención al cliente, notificaciones del servicio y mejoras del producto.</li>
      </ul>

      <h3>3. Bases legales</h3>
      <p>
        Tratamos tus datos en base a la ejecución del contrato, el interés legítimo y tu
        consentimiento cuando corresponda (por ejemplo, comunicaciones no esenciales).
      </p>

      <h3>4. Compartir datos</h3>
      <p>
        Podemos compartir datos con proveedores que permiten operar la plataforma
        (procesadores de pago, servicios de logística, verificación de identidad y
        proveedores tecnológicos). Estos actúan en nuestro nombre bajo acuerdos de
        confidencialidad y solo para los fines del servicio.
      </p>
      <p><strong>No vendemos tu información personal a terceros.</strong></p>

      <h3>5. Retención y seguridad</h3>
      <p>
        Conservamos los datos el tiempo necesario para las finalidades indicadas y para cumplir
        obligaciones legales. Aplicamos medidas técnicas y organizativas razonables para
        protegerlos contra accesos no autorizados, pérdida o uso indebido.
      </p>

      <h3>6. Tus derechos</h3>
      <ul>
        <li>Acceder, corregir, eliminar o portar tus datos.</li>
        <li>Oponerte o solicitar limitación del tratamiento cuando corresponda.</li>
        <li>Retirar el consentimiento sin afectar la licitud del uso previo.</li>
      </ul>
      <p>
        Para ejercerlos, escribinos a{" "}
        <a href="mailto:privacidad@laotratribuna.com">privacidad@laotratribuna.com</a>.
      </p>

      <h3>7. Cambios</h3>
      <p>
        Podemos actualizar esta Declaración. La versión vigente siempre estará publicada en este enlace.
      </p>
    </div>
  );
}