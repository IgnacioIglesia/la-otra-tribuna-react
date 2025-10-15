// src/pages/Perfil/Perfil.js
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import AddressBookModal from "../Checkout/components/AddressBookModal";
import "./Perfil.css";

const KYC_BUCKET = "verificaciones"; // 👈 cambia si tu bucket tiene otro nombre

function initialsFrom(nombre = "", apellido = "", email = "") {
  const n = (nombre || "").trim().split(/\s+/)[0] || "";
  const a = (apellido || "").trim().split(/\s+/)[0] || "";
  const ini = (n[0] || "") + (a[0] || "");
  return (ini || (email[0] || "?")).toUpperCase();
}

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
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);

  // verificación identidad (KYC)
  const [kyc, setKyc] = useState(null); // {id_verificacion, estado, url_foto, enviado_at, verificado_at}
  const [kycFile, setKycFile] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);

  // helpers sesión/usuario
  const loadSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  }, []);

  const ensureUsuario = useCallback(async (authUser) => {
    // Busca por id_auth; si no existe, inserta con metadata
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

  // cambiar contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwd.next || pwd.next.length < 6) {
      alert("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      alert("Las contraseñas no coinciden.");
      return;
    }
    // Supabase v2: con sesión válida se puede updateUser({password})
    try {
      setPwdLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        password: pwd.next,
      });
      if (error) throw error;

      setPwd({ current: "", next: "", confirm: "" });
      window.dispatchEvent(
        new CustomEvent("toast", { detail: { text: "Contraseña actualizada" } })
      );
    } catch (err) {
      console.error(err);
      alert(err?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setPwdLoading(false);
    }
  };

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

      // inserta nueva solicitud (o reemplaza si querés)
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
            <form
              onSubmit={handleChangePassword}
              className="grid-2"
              style={{ alignItems: "end" }}
            >
              <div className="field">
                <label htmlFor="pwd-new">Nueva contraseña</label>
                <input
                  id="pwd-new"
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="pwd-confirm">Confirmar contraseña</label>
                <input
                  id="pwd-confirm"
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) =>
                    setPwd((p) => ({ ...p, confirm: e.target.value }))
                  }
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="actions-row" style={{ gridColumn: "1/-1" }}>
                <button className="btn primary" disabled={pwdLoading}>
                  {pwdLoading ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </div>
            </form>
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