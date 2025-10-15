import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import "./Perfil.css";

function initialsFrom(nombre = "", apellido = "", email = "") {
  const n = (nombre || "").trim().split(/\s+/)[0] || "";
  const a = (apellido || "").trim().split(/\s+/)[0] || "";
  const ini = (n[0] || "") + (a[0] || "");
  return (ini || (email[0] || "?")).toUpperCase();
}

export default function Perfil() {
  // --- usuario sesión ---
  const [sessionUser, setSessionUser] = useState(null);

  // --- estado UI ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Datos personales ---
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");

  // --- Dirección ---
  const [pais, setPais] = useState("Uruguay");
  const [departamento, setDepartamento] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [cp, setCp] = useState("");

  // PKs
  const [idUsuario, setIdUsuario] = useState(null);
  const [idDireccion, setIdDireccion] = useState(null);

  const loadSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  }, []);

  const ensureUsuario = useCallback(async (authUser) => {
    // Busca fila en "usuario" por id_auth; si no existe, la crea con metadata
    const { data: u, error } = await supabase
      .from("usuario")
      .select("id_usuario,nombre,apellido,email")
      .eq("id_auth", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Error select usuario:", error);
    }
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
      .select("id_usuario,nombre,apellido,email")
      .single();

    if (insertRes.error) {
      console.error("Error insert usuario:", insertRes.error);
      throw insertRes.error;
    }
    return insertRes.data;
  }, []);

  const loadDireccion = useCallback(async (id_usuario) => {
    const { data: dlist, error } = await supabase
      .from("direccion")
      .select(
        "id_direccion,pais,departamento,ciudad,calle,numero,cp"
      )
      .eq("id_usuario", id_usuario)
      .order("id_direccion", { ascending: true })
      .limit(1);

    if (error) {
      console.error("Error select direccion:", error);
      return null;
    }
    return dlist?.[0] || null;
  }, []);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const session = await loadSession();
      if (!session) {
        // sin sesión -> redirigir a login si querés
        setLoading(false);
        return;
      }

      const authUser = session.user;
      setSessionUser(authUser);

      // 1) usuario
      const u = await ensureUsuario(authUser);
      setIdUsuario(u.id_usuario);
      setNombre(u.nombre || "");
      setApellido(u.apellido || "");
      setEmail(u.email || authUser.email || "");

      // 2) dirección
      const d = await loadDireccion(u.id_usuario);
      if (d) {
        setIdDireccion(d.id_direccion);
        setPais(d.pais || "Uruguay");
        setDepartamento(d.departamento || "");
        setCiudad(d.ciudad || "");
        setCalle(d.calle || "");
        setNumero(d.numero || "");
        setCp(d.cp || "");
      } else {
        // sin dirección guardada -> defaults
        setIdDireccion(null);
        setPais("Uruguay");
        setDepartamento("");
        setCiudad("");
        setCalle("");
        setNumero("");
        setCp("");
      }
    } finally {
      setLoading(false);
    }
  }, [loadSession, ensureUsuario, loadDireccion]);

  useEffect(() => {
    hydrate();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      hydrate();
    });
    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, [hydrate]);

  const handleSave = async () => {
    if (!idUsuario) return;
    setSaving(true);
    try {
      // 1) Actualizar usuario
      const upU = await supabase
        .from("usuario")
        .update({
          nombre: (nombre || "").trim(),
          apellido: (apellido || "").trim(),
        })
        .eq("id_usuario", idUsuario);

      if (upU.error) throw upU.error;

      // 2) Insertar/actualizar dirección
      const payload = {
        id_usuario: idUsuario,
        pais: pais || "Uruguay",
        departamento: (departamento || "").trim(),
        ciudad: (ciudad || "").trim(),
        calle: (calle || "").trim(),
        numero: (numero || "").trim() || null,
        cp: (cp || "").trim(),
      };

      let dirRes;
      if (idDireccion) {
        dirRes = await supabase
          .from("direccion")
          .update(payload)
          .eq("id_direccion", idDireccion)
          .select("id_direccion")
          .single();
      } else {
        dirRes = await supabase
          .from("direccion")
          .insert(payload)
          .select("id_direccion")
          .single();
      }
      if (dirRes.error) throw dirRes.error;
      setIdDireccion(dirRes.data?.id_direccion || idDireccion);

      // listo
      window.dispatchEvent(
        new CustomEvent("toast", { detail: { text: "Cambios guardados" } })
      );
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar. " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const initials = initialsFrom(nombre, apellido, email);

  return (
    <>
      <HeaderSimplif />
      <main className="profile-wrap">
        <div className="profile-header">
          <div className="user-avatar big">{initials}</div>
          <div>
            <h2 id="titleName" style={{ margin: "0 0 4px" }}>
              {nombre || "(Sin nombre)"} {apellido}
            </h2>
            <div className="muted" id="titleEmail">
              {email}
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <section className="profile-card">
          <h3 style={{ margin: "0 0 12px" }}>Datos personales</h3>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="apellido">Apellido</label>
              <input
                id="apellido"
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Tu apellido"
                required
              />
            </div>
            <div className="field" style={{ gridColumn: "1/-1" }}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} readOnly />
              <div className="note muted">
                El email se gestiona desde tu cuenta y no puede modificarse aquí.
              </div>
            </div>
          </div>
        </section>

        {/* Dirección */}
        <section className="profile-card">
          <h3 style={{ margin: "0 0 12px" }}>Dirección</h3>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="pais">País</label>
              <select
                id="pais"
                value={pais}
                onChange={(e) => setPais(e.target.value)}
              >
                <option value="Uruguay">Uruguay</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="departamento">Departamento</label>
              <input
                id="departamento"
                type="text"
                placeholder="Cerro Largo"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="ciudad">Ciudad</label>
              <input
                id="ciudad"
                type="text"
                placeholder="Melo"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
              />
            </div>

            <div className="field" style={{ gridColumn: "1/3" }}>
              <label htmlFor="calle">Dirección</label>
              <input
                id="calle"
                type="text"
                placeholder="Avenida / Calle y esquina"
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="numero">Nº apto/casa</label>
              <input
                id="numero"
                type="text"
                placeholder="3042"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="cp">Código postal</label>
              <input
                id="cp"
                type="text"
                inputMode="numeric"
                placeholder="11300"
                value={cp}
                onChange={(e) => setCp(e.target.value)}
              />
            </div>
          </div>

          <div className="actions-row">
            <button
              className="btn primary"
              onClick={handleSave}
              disabled={saving || loading || !idUsuario}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
          <div className="note muted">
            Se guarda tu dirección principal. Podrás ampliarlo a múltiples
            direcciones más adelante.
          </div>
        </section>

        <footer className="muted" style={{ margin: "22px 0 36px" }}>
          © {new Date().getFullYear()} La Otra Tribuna.
        </footer>
      </main>
    </>
  );
}