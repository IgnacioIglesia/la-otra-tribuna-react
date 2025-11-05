// src/pages/Perfil/Perfil.js
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import AddressBookModal from "../Checkout/components/AddressBookModal";
import "./Perfil.css";

const KYC_BUCKET = "verificaciones";

function initialsFrom(nombre = "", apellido = "", email = "") {
  const n = (nombre || "").trim().split(/\s+/)[0] || "";
  const a = (apellido || "").trim().split(/\s+/)[0] || "";
  const ini = (n[0] || "") + (a[0] || "");
  return (ini || (email[0] || "?")).toUpperCase();
}

// Validación de contraseña mejorada
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  if (password.length < minLength) errors.push(`Mínimo ${minLength} caracteres`);
  if (!hasUpperCase) errors.push("Una letra mayúscula");
  if (!hasNumber) errors.push("Un número");
  if (!hasSymbol) errors.push("Un símbolo especial");

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default function Perfil() {
  // sesión
  const [sessionUser, setSessionUser] = useState(null);
  const [idUsuario, setIdUsuario] = useState(null);

  // ui
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);

  // datos personales
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");

  // direcciones
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [addrModalOpen, setAddrModalOpen] = useState(false);

  // seguridad: password
  const [pwdMode, setPwdMode] = useState("form"); // "form" | "request-sent"
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // verificación identidad (KYC)
  const [kyc, setKyc] = useState(null);
  const [kycFile, setKycFile] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);

  // helpers sesión/usuario
  const loadSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  }, []);

  const ensureUsuario = useCallback(async (authUser) => {
    const { data: u, error } = await supabase
      .from("usuario")
      .select("id_usuario,nombre,apellido,email,id_auth")
      .eq("id_auth", authUser.id)
      .maybeSingle();

    if (error) console.error("Error select usuario:", error);
    if (u) return u;

    const meta = authUser.user_metadata || {};
    const insertRes = await supabase
      .from("usuario")
      .insert({
        id_auth: authUser.id,
        nombre: meta?.nombre || "",
        apellido: meta?.apellido || "",
        email: authUser.email || "",
      })
      .select("id_usuario,nombre,apellido,email,id_auth")
      .single();

    if (insertRes.error) {
      console.error("Error insert usuario:", insertRes.error);
      throw insertRes.error;
    }
    return insertRes.data;
  }, []);

  const fetchAddresses = useCallback(async (id_usuario) => {
    const { data, error } = await supabase
      .from("direccion")
      .select(
        "id_direccion,pais,departamento,ciudad,calle,numero,cp,is_default,created_at"
      )
      .eq("id_usuario", id_usuario)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error direcciones:", error);
      setAddresses([]);
      setSelectedAddr(null);
      return;
    }
    setAddresses(data || []);
    setSelectedAddr((data || [])[0] || null);
  }, []);

  const fetchKyc = useCallback(async (id_usuario) => {
    const { data, error } = await supabase
      .from("verificacion_identidad")
      .select("id_verificacion, id_usuario, url_foto, estado, enviado_at, verificado_at")
      .eq("id_usuario", id_usuario)
      .order("enviado_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("Error KYC:", error);
      setKyc(null);
      return;
    }
    setKyc(data || null);
  }, []);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const session = await loadSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setSessionUser(session.user);

      const u = await ensureUsuario(session.user);
      setIdUsuario(u.id_usuario);
      setNombre(u.nombre || "");
      setApellido(u.apellido || "");
      setEmail(u.email || session.user.email || "");

      await Promise.all([fetchAddresses(u.id_usuario), fetchKyc(u.id_usuario)]);
    } finally {
      setLoading(false);
    }
  }, [loadSession, ensureUsuario, fetchAddresses, fetchKyc]);

  useEffect(() => {
    hydrate();
    const { data: sub } = supabase.auth.onAuthStateChange(() => hydrate());
    return () => sub?.subscription?.unsubscribe?.();
  }, [hydrate]);

  // guardar datos personales
  const handleSaveUser = async () => {
    if (!idUsuario) return;
    setSavingUser(true);
    try {
      const upU = await supabase
        .from("usuario")
        .update({
          nombre: (nombre || "").trim(),
          apellido: (apellido || "").trim(),
        })
        .eq("id_usuario", idUsuario);
      if (upU.error) throw upU.error;

      window.dispatchEvent(
        new CustomEvent("toast", { detail: { text: "Datos actualizados" } })
      );
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar. " + (e?.message || ""));
    } finally {
      setSavingUser(false);
    }
  };

  // NUEVO: Solicitar cambio de contraseña (envía email)
  const handleRequestPasswordChange = async (e) => {
    e.preventDefault();
    
    if (!email) {
      alert("No se pudo obtener tu email.");
      return;
    }

    setPwdLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/perfil`,
      });

      if (error) throw error;

      setPwdMode("request-sent");
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { text: "Email enviado. Revisá tu bandeja de entrada." },
        })
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo enviar el email: " + (err?.message || ""));
    } finally {
      setPwdLoading(false);
    }
  };

  // NUEVO: Actualizar contraseña (cuando vienen del email)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!pwd.next || pwd.next.length < 8) {
      alert("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (pwd.next !== pwd.confirm) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    // Validar requisitos
    const validation = validatePassword(pwd.next);
    if (!validation.isValid) {
      alert(`La contraseña debe tener:\n• ${validation.errors.join("\n• ")}`);
      return;
    }

    setPwdLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: pwd.next,
      });

      if (error) throw error;

      setPwd({ next: "", confirm: "" });
      setPwdMode("form");
      setShowPassword(false);
      setShowConfirmPassword(false);

      window.dispatchEvent(
        new CustomEvent("toast", { detail: { text: "Contraseña actualizada exitosamente" } })
      );
    } catch (err) {
      console.error(err);
      alert(err?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setPwdLoading(false);
    }
  };

  // Detectar si están en modo reset (vinieron desde el email)
  useEffect(() => {
    const checkResetMode = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get("type");
      
      if (type === "recovery") {
        setPwdMode("update");
      }
    };

    checkResetMode();
  }, []);

  // subir/verificar identidad
  const onPickKycFile = (e) => {
    const f = e.target.files?.[0];
    setKycFile(f || null);
  };

  const sendKyc = async () => {
    if (!idUsuario) return;
    if (!kycFile) {
      alert("Elegí una foto de tu cédula (frente).");
      return;
    }
    setKycLoading(true);
    try {
      const path = `${idUsuario}/${Date.now()}-${kycFile.name}`;
      const { error: upErr } = await supabase.storage
        .from(KYC_BUCKET)
        .upload(path, kycFile, {
          upsert: false,
          contentType: kycFile.type || "image/jpeg",
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(KYC_BUCKET).getPublicUrl(path);
      const url_foto = pub?.publicUrl;

      const payload = {
        id_usuario: idUsuario,
        url_foto,
        estado: "pendiente",
        enviado_at: new Date().toISOString(),
        verificado_at: null,
      };

      const { error: insErr } = await supabase
        .from("verificacion_identidad")
        .insert([payload]);
      if (insErr) throw insErr;

      await fetchKyc(idUsuario);
      setKycFile(null);
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { text: "Documento enviado. Estado: pendiente" },
        })
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo enviar la verificación. " + (err?.message || ""));
    } finally {
      setKycLoading(false);
    }
  };

  const initials = initialsFrom(nombre, apellido, email);
  const verified = kyc?.estado === "aceptado";

  return (
    <>
      <HeaderSimplif />

      <main className="profile-wrap">
        {/* Header */}
        <div className="profile-header">
          <div className="user-avatar big">{initials}</div>
          <div>
            <h2 style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
              {nombre || "(Sin nombre)"} {apellido}
              {verified && (
                <span
                  title="Cuenta verificada"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#e0f2fe",
                    color: "#0369a1",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l2.39 2.39L17.17 5l.44 2.78L20 10l-2.39 2.39L17.17 15l-2.78.44L12 18l-2.39-2.39L7 15l-.44-2.78L4 10l2.39-2.39L7 5l2.78-.61L12 2z" fill="#38bdf8"/>
                    <path d="M9.5 11.5l1.7 1.7 3.3-3.3" stroke="#075985" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Verificado
                </span>
              )}
            </h2>
            <div className="muted">{email}</div>
          </div>
        </div>

        {/* Datos personales */}
        <section className="profile-card">
          <h3 style={{ margin: "0 0 12px" }}>Datos personales</h3>
          {loading ? (
            <div className="muted">Cargando…</div>
          ) : (
            <div className="grid-2">
              <div className="field">
                <label htmlFor="p-nombre">Nombre</label>
                <input
                  id="p-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="field">
                <label htmlFor="p-apellido">Apellido</label>
                <input
                  id="p-apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Tu apellido"
                />
              </div>
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>Email</label>
                <input value={email} readOnly />
                <div className="note muted">
                  El email se gestiona desde tu cuenta y no puede modificarse aquí.
                </div>
              </div>
              <div className="actions-row" style={{ gridColumn: "1/-1" }}>
                <button
                  className="btn primary"
                  onClick={handleSaveUser}
                  disabled={savingUser || !idUsuario}
                >
                  {savingUser ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Direcciones */}
        <section className="profile-card">
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Direcciones</h3>
            {idUsuario && (
              <button
                className="btn"
                onClick={() => setAddrModalOpen(true)}
                disabled={loading}
              >
                Gestionar direcciones
              </button>
            )}
          </div>

          {loading ? (
            <div className="muted" style={{ marginTop: 8 }}>
              Cargando direcciones…
            </div>
          ) : addresses.length === 0 ? (
            <div className="muted" style={{ marginTop: 8 }}>
              No tenés direcciones guardadas.
            </div>
          ) : (
            <ul className="addr-list-inline">
              {addresses.map((a) => (
                <li
                  key={a.id_direccion}
                  className={`addr-chip ${a.is_default ? "is-default" : ""}`}
                >
                  <div className="addr-chip-title">
                    {a.calle}
                    {a.numero ? ` ${a.numero}` : ""},{" "}
                    {a.ciudad}, {a.departamento}
                  </div>
                  <div className="addr-chip-sub">
                    {a.cp ? `CP ${a.cp} · ` : ""}
                    {a.pais}
                    {a.is_default ? " · Principal" : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Seguridad */}
        <section className="profile-card">
          <h3 style={{ margin: "0 0 12px" }}>Seguridad</h3>

          {/* Cambiar contraseña */}
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <strong style={{ fontSize: 14 }}>Cambiar contraseña</strong>

            {pwdMode === "form" && (
              <form onSubmit={handleRequestPasswordChange} style={{ display: "grid", gap: 12 }}>
                <p className="note muted" style={{ margin: 0 }}>
                  Para cambiar tu contraseña, te enviaremos un email de verificación. Hacé clic en el enlace del email para continuar.
                </p>
                <div className="actions-row" style={{ justifyContent: "flex-start" }}>
                  <button className="btn primary" disabled={pwdLoading || !email}>
                    {pwdLoading ? "Enviando..." : "Solicitar cambio de contraseña"}
                  </button>
                </div>
              </form>
            )}

            {pwdMode === "request-sent" && (
              <div className="password-info-box">
                <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="12" cy="12" r="10" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
                    <path d="M12 8v4m0 4h.01" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div>
                    <strong style={{ color: "#166534", display: "block", marginBottom: 4 }}>
                      Email enviado
                    </strong>
                    <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                      Revisá tu bandeja de entrada. El enlace expira en 1 hora.
                    </p>
                  </div>
                </div>
                <button
                  className="btn"
                  onClick={() => setPwdMode("form")}
                  style={{ marginTop: 12, width: "fit-content" }}
                >
                  Volver
                </button>
              </div>
            )}

            {pwdMode === "update" && (
              <form onSubmit={handleUpdatePassword} className="grid-2" style={{ alignItems: "end" }}>
                <div className="field">
                  <label htmlFor="pwd-new">Nueva contraseña</label>
                  <div className="password-input-wrapper">
                    <input
                      id="pwd-new"
                      type={showPassword ? "text" : "password"}
                      value={pwd.next}
                      onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  <div className="password-requirements">
                    <small className="muted">
                      • Mínimo 8 caracteres<br />
                      • Una mayúscula<br />
                      • Un número<br />
                      • Un símbolo especial
                    </small>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="pwd-confirm">Confirmar contraseña</label>
                  <div className="password-input-wrapper">
                    <input
                      id="pwd-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      value={pwd.confirm}
                      onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                      placeholder="Repetí la contraseña"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>
                <div className="actions-row" style={{ gridColumn: "1/-1", gap: 10 }}>
                  <button className="btn primary" disabled={pwdLoading}>
                    {pwdLoading ? "Actualizando..." : "Actualizar contraseña"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setPwdMode("form");
                      setPwd({ next: "", confirm: "" });
                      setShowPassword(false);
                      setShowConfirmPassword(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          <hr style={{ border: 0, borderTop: "1px dashed #e5e7eb", margin: "12px 0 16px" }} />

          {/* Verificar identidad */}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 14 }}>Confirmar tu identidad</strong>
              {kyc?.estado && (
                <span
                  style={{
                    fontSize: 12,
                    borderRadius: 999,
                    padding: "2px 8px",
                    background:
                      kyc.estado === "aceptado"
                        ? "#dcfce7"
                        : kyc.estado === "rechazado"
                        ? "#fee2e2"
                        : "#f1f5f9",
                    color:
                      kyc.estado === "aceptado"
                        ? "#166534"
                        : kyc.estado === "rechazado"
                        ? "#991b1b"
                        : "#334155",
                    fontWeight: 700,
                  }}
                >
                  {kyc.estado}
                </span>
              )}
            </div>

            {kyc?.url_foto && (
              <div className="muted" style={{ fontSize: 13 }}>
                Último envío: {new Date(kyc.enviado_at).toLocaleString()}
                {kyc.verificado_at
                  ? ` · Verificado: ${new Date(kyc.verificado_at).toLocaleString()}`
                  : ""}
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              <label className="btn" style={{ width: "fit-content", cursor: "pointer" }}>
                Subir foto de cédula
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPickKycFile}
                  hidden
                />
              </label>
              {kycFile && (
                <div className="muted" style={{ fontSize: 13 }}>
                  Archivo seleccionado: <strong>{kycFile.name}</strong>
                </div>
              )}
              <div className="actions-row" style={{ justifyContent: "flex-start" }}>
                <button
                  className="btn primary"
                  type="button"
                  disabled={!kycFile || kycLoading}
                  onClick={sendKyc}
                >
                  {kycLoading ? "Enviando…" : kyc ? "Reenviar verificación" : "Enviar verificación"}
                </button>
                {kyc?.url_foto && (
                  <a
                    className="btn"
                    href={kyc.url_foto}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver archivo enviado
                  </a>
                )}
              </div>
              <p className="note muted">
                Solo usamos la foto para confirmar tu identidad. Si es aceptada,
                verás tu cuenta marcada como <em>Verificada</em> y podrás publicar.
              </p>
            </div>
          </div>
        </section>

        <footer className="muted" style={{ margin: "22px 0 36px" }}>
          © {new Date().getFullYear()} La Otra Tribuna.
        </footer>
      </main>

      <style>{`
        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-wrapper input {
          padding-right: 48px;
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          padding: 4px 8px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .toggle-password:hover {
          opacity: 1;
        }

        .password-requirements {
          padding: 10px 12px;
          background-color: #f8fafc;
          border-radius: 6px;
          border-left: 3px solid #004225;
          margin-top: 4px;
        }

        .password-requirements small {
          line-height: 1.6;
        }

        .password-info-box {
          padding: 16px;
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
        }
      `}</style>

      {/* Modal de Direcciones */}
      {addrModalOpen && idUsuario && (
        <AddressBookModal
          open={addrModalOpen}
          onClose={() => setAddrModalOpen(false)}
          idUsuario={idUsuario}
          addresses={addresses}
          selectedId={selectedAddr?.id_direccion || null}
          onChangeSelected={(addr) => setSelectedAddr(addr)}
          onRefresh={() => fetchAddresses(idUsuario)}
        />
      )}
    </>
  );
}