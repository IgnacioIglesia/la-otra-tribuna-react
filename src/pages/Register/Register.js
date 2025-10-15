// src/pages/Register/Register.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";

export default function Register() {
  const navigate = useNavigate();

  // 1 = datos básicos, 2 = dirección
  const [step, setStep] = useState(1);

  // Estado del formulario (sin campo de apto/casa)
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    accept: false, // T&C
    pais: "Uruguay",
    departamento: "",
    ciudad: "",
    direccion: "",
    cp: "",
  });

  const update = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Validaciones
  const validateStep1 = () => {
    if (!form.nombre.trim()) return "Ingresá tu nombre.";
    if (!form.apellido.trim()) return "Ingresá tu apellido.";
    if (!form.email.trim()) return "Ingresá un email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Ingresá un email válido.";
    if (!form.password || form.password.length < 6)
      return "La contraseña debe tener al menos 6 caracteres.";
    if (!form.accept)
      return "Tenés que aceptar los Términos y la Privacidad.";
    return null;
  };

  const validateStep2 = () => {
    if (!form.pais.trim()) return "Seleccioná un país.";
    if (!form.departamento.trim()) return "Ingresá un departamento.";
    if (!form.ciudad.trim()) return "Ingresá una ciudad.";
    if (!form.direccion.trim()) return "Ingresá una dirección.";
    if (!form.cp.trim()) return "Ingresá un código postal.";
    return null;
  };

  const [error, setError] = useState("");

  const handleNext = (e) => {
    e.preventDefault();
    const msg = validateStep1();
    if (msg) return setError(msg);
    setError("");
    setStep(2);
  };

  const handleBack = (e) => {
    e.preventDefault();
    setError("");
    setStep(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validateStep2();
    if (msg) return setError(msg);
    setError("");

    // TODO: enviar al backend / Supabase
    console.log("Cuenta a crear:", form);

    // Si quisieras simular sesión:
    // localStorage.setItem("user", JSON.stringify({ nombre: form.nombre, email: form.email }));

    navigate("/"); // al finalizar, ir al inicio
  };

  return (
    <>
      <HeaderSimplif />

      <main className="auth-wrap">
        <form
          className="auth-card"
          onSubmit={step === 1 ? handleNext : handleSubmit}
          noValidate
        >
          {/* Cabecera de la tarjeta */}
          <div className="auth-head" style={{ textAlign: "center" }}>
            <img
              src="/assets/logo.png"
              alt="La Otra Tribuna"
              className="auth-logo"
            />
            <h2 className="auth-title">Registrarse</h2>
          </div>

          {/* Paso 1: datos básicos */}
          {step === 1 && (
            <div className="auth-body auth-form">
              <div className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={form.nombre}
                  onChange={update("nombre")}
                  required
                />
              </div>

              <div className="field">
                <span>Apellido</span>
                <input
                  type="text"
                  placeholder="Tu apellido"
                  value={form.apellido}
                  onChange={update("apellido")}
                  required
                />
              </div>

              <div className="field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={form.email}
                  onChange={update("email")}
                  required
                />
              </div>

              <div className="field">
                <span>Contraseña</span>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={update("password")}
                  required
                />
              </div>

              <label className="terms">
                <input
                  type="checkbox"
                  checked={form.accept}
                  onChange={update("accept")}
                  style={{ marginRight: 8 }}
                />
                Al continuar, acepto los{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  Términos y Condiciones
                </a>{" "}
                y la{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Declaración de Privacidad
                </a>
                .
              </label>

              {error && <div className="err">{error}</div>}

              <button type="submit" className="btn btn-primary">
                Continuar
              </button>

              <p className="auth-alt">
                ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
              </p>
            </div>
          )}

          {/* Paso 2: dirección (SIN campo de apto/casa) */}
          {step === 2 && (
            <div className="auth-body auth-form">
              <div className="field">
                <span>País</span>
                <select value={form.pais} onChange={update("pais")}>
                  <option>Uruguay</option>
                </select>
              </div>

              <div className="field">
                <span>Departamento</span>
                <input
                  type="text"
                  placeholder="Ej: Cerro Largo"
                  value={form.departamento}
                  onChange={update("departamento")}
                  required
                />
              </div>

              <div className="field">
                <span>Ciudad</span>
                <input
                  type="text"
                  placeholder="Ej: Melo"
                  value={form.ciudad}
                  onChange={update("ciudad")}
                  required
                />
              </div>

              <div className="field">
                <span>Dirección</span>
                <input
                  type="text"
                  placeholder="Calle, esquina y número"
                  value={form.direccion}
                  onChange={update("direccion")}
                  required
                />
              </div>

              <div className="field">
                <span>Código postal</span>
                <input
                  type="text"
                  placeholder="Ej: 11300"
                  value={form.cp}
                  onChange={update("cp")}
                  required
                />
              </div>

              {error && <div className="err">{error}</div>}

              <div className="actions-row">
                <button className="btn btn-ghost" onClick={handleBack}>
                  Volver
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear cuenta
                </button>
              </div>

              <p className="auth-alt">
                ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
              </p>
            </div>
          )}
        </form>
      </main>
    </>
  );
}