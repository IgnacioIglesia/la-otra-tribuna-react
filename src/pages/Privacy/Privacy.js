import React from "react";
import "./Privacy.css";

export default function Privacy() {
  return (
    <div className="terms-container">
      <h1>Declaración de Privacidad</h1>
      <p className="terms-date">
        Fecha de última actualización: 2025-09-29
      </p>

      <p>
        Cómo recopilamos, usamos y protegemos tu información personal.
      </p>

      <h3>1. Datos que recopilamos</h3>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, apellido, email, contraseña (encriptada), país/ciudad, dirección, teléfono.
        </li>
        <li>
          <strong>Datos de uso:</strong> logs, dispositivo, IP, páginas visitadas.
        </li>
        <li>
          <strong>Datos de transacción:</strong> publicaciones, compras, calificaciones, mensajería.
        </li>
      </ul>

      <h3>2. Para qué los usamos</h3>
      <ul>
        <li>Operar el servicio (registro, login, publicaciones, pagos y envíos).</li>
        <li>Seguridad, prevención de fraude y cumplimiento legal.</li>
        <li>Atención al cliente, notificaciones del servicio y mejoras del producto.</li>
      </ul>

      <h3>3. Bases legales</h3>
      <p>
        Usamos tus datos con base en la ejecución del contrato, el interés legítimo y tu consentimiento cuando corresponda
        (por ejemplo, comunicaciones comerciales).
      </p>

      <h3>4. Compartir datos</h3>
      <p>
        Podemos compartir datos con procesadores de pago, logística y proveedores tecnológicos que actúan en nuestro nombre,
        bajo acuerdos de confidencialidad y solo para prestar el servicio.
      </p>

      <h3>5. Retención y seguridad</h3>
      <p>
        Conservamos los datos el tiempo necesario para las finalidades indicadas y aplicamos medidas técnicas y organizativas
        razonables para protegerlos.
      </p>

      <h3>6. Tus derechos</h3>
      <ul>
        <li>Acceder, corregir, eliminar y portar tus datos.</li>
        <li>Oponerte o solicitar limitación del tratamiento en los casos previstos por ley.</li>
        <li>Retirar el consentimiento sin afectar la licitud previa.</li>
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