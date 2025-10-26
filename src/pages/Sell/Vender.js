import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";
import "./Vender.css";

const BUCKET = "publicaciones";

/* Mappers */
const mapCategoriaPublicacion = (v) => (v === "Selección" ? "Seleccion" : v);
const mapAutenticidad = (v) =>
  v === "Réplica" || v === "Replica" ? "Réplica" : "Original";
const mapCategoriaProductoBase = (v) => {
  const pub = mapCategoriaPublicacion(v);
  return pub === "Club" || pub === "Seleccion" ? pub : null;
};

export default function Vender() {
  const navigate = useNavigate();
  const location = useLocation();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessionEmail, setSessionEmail] = useState("");
  
  // 🔒 Estados de verificación
  const [userStatus, setUserStatus] = useState({
    verified: false,
    banned: false,
    banReason: "",
    canPublish: false,
  });

  const [form, setForm] = useState({
    equipo: "",
    titulo: "",
    descripcion: "",
    precio: "",
    moneda: "UYU",
    condicion: "Nuevo",
    autenticidad: "Original",
    talle: "M",
    tipo: "Club",
    coleccion: "Actual",
    estado: "Activa",
    ofertas: false,
    imagen: null,
    stock: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState("");

  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("¡Publicación creada!");
  const [successText, setSuccessText] = useState(
    "Tu publicación se guardó correctamente."
  );

  // ====== Verificar sesión y estado del usuario ======
  useEffect(() => {
    (async () => {
      try {
        // 1. Verificar sesión
        const { data } = await supabase.auth.getSession();
        const sess = data?.session;
        if (!sess) {
          const returnTo = encodeURIComponent(
            location.pathname + location.search
          );
          navigate(`/login?return=${returnTo}`, { replace: true });
          return;
        }

        const email = sess.user?.email || "";
        setSessionEmail(email);

        // 2. Obtener usuario y su estado
        const { data: usuario, error: userErr } = await supabase
          .from("usuario")
          .select("id_usuario, id_auth, esta_baneado, razon_baneo")
          .eq("email", email)
          .maybeSingle();

        if (userErr) throw userErr;
        if (!usuario) {
          alert("No se encontró tu usuario.");
          navigate("/", { replace: true });
          return;
        }

        // 3. Verificar si está baneado
        if (usuario.esta_baneado) {
          setUserStatus({
            verified: false,
            banned: true,
            banReason: usuario.razon_baneo || "Tu cuenta ha sido suspendida.",
            canPublish: false,
          });
          setCheckingAuth(false);
          return;
        }

        // 4. Verificar si tiene verificación aceptada
        const { data: verificacion, error: verErr } = await supabase
          .from("verificacion_identidad")
          .select("estado")
          .eq("id_usuario", usuario.id_usuario)
          .eq("estado", "aceptado")
          .maybeSingle();

        if (verErr && verErr.code !== "PGRST116") throw verErr;

        const isVerified = !!verificacion;

        setUserStatus({
          verified: isVerified,
          banned: false,
          banReason: "",
          canPublish: isVerified,
        });

        setCheckingAuth(false);
      } catch (err) {
        console.error("Error verificando estado:", err);
        alert("Ocurrió un error al verificar tu cuenta.");
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, location]);

  const update = (field) => (e) => {
    const value =
      e.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, imagen: file }));
    setPreview(URL.createObjectURL(file));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Doble verificación antes de publicar
    if (!userStatus.canPublish) {
      alert("No tienes permisos para publicar.");
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);

      const {
        equipo,
        titulo,
        descripcion,
        precio,
        moneda,
        condicion,
        autenticidad,
        talle,
        tipo,
        coleccion,
        estado,
        ofertas,
        imagen,
        stock,
      } = form;

      if (!equipo || !titulo || !precio || !imagen) {
        alert("Completá equipo, título, precio y subí una imagen.");
        setSubmitting(false);
        return;
      }

      // 1) usuario por email
      const { data: usuario, error: userErr } = await supabase
        .from("usuario")
        .select("id_usuario, email")
        .eq("email", sessionEmail)
        .maybeSingle();

      if (userErr) throw userErr;
      if (!usuario) {
        alert("No se encontró tu usuario en la tabla 'usuario' (por email).");
        setSubmitting(false);
        return;
      }
      const id_usuario = usuario.id_usuario;

      // 2) subir imagen
      const path = `${id_usuario}/${Date.now()}-${imagen.name}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, imagen, {
          upsert: false,
          contentType: imagen.type || "image/jpeg",
        });
      if (upErr) throw upErr;

      const { data: pubUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const fotoURL = pubUrl?.publicUrl;

      // 3) producto_base
      const categoriaProd = mapCategoriaProductoBase(tipo);
      const { data: prod, error: prodErr } = await supabase
        .from("producto_base")
        .insert([
          {
            equipo,
            categoria: categoriaProd,
            nombre_public: titulo,
          },
        ])
        .select("id_producto")
        .single();

      if (prodErr) throw prodErr;
      const id_producto = prod.id_producto;

      // 4) publicacion
      const pubRow = {
        id_usuario,
        id_producto,
        titulo,
        descripcion,
        precio: Number(precio),
        moneda,
        condicion,
        autenticidad: mapAutenticidad(autenticidad),
        categoria: mapCategoriaPublicacion(tipo),
        coleccion,
        talle,
        stock: Number(stock || 1),
        estado,
        club: equipo,
        permiso_oferta: Boolean(ofertas),
      };

      const { data: pub, error: pubErr } = await supabase
        .from("publicacion")
        .insert([pubRow])
        .select("id_publicacion")
        .single();
      if (pubErr) throw pubErr;

      // 5) foto
      const { error: fotoErr } = await supabase.from("foto").insert([
        {
          id_publicacion: pub.id_publicacion,
          url: fotoURL,
          orden_foto: 1,
        },
      ]);
      if (fotoErr) throw fotoErr;

      // ✅ 6) ÉXITO
      const msg = ofertas
        ? "Tu publicación se guardó correctamente. Si no se vende en 30 días, entrará automáticamente en ofertas (10% OFF)."
        : "Tu publicación se guardó correctamente.";

      setSuccessTitle("¡Publicación creada!");
      setSuccessText(msg);
      setSuccessOpen(true);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1500);
        });
      });
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al publicar. Revisá la consola.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <>
        <HeaderSimplif />
        <div
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: "50vh",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "4px solid #eee",
              borderTopColor: "#16a34a",
              animation: "spin 1s linear infinite",
            }}
          />
          <p>Verificando acceso…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </>
    );
  }

  // 🚫 USUARIO BANEADO
  if (userStatus.banned) {
    return (
      <>
        <HeaderSimplif />
        <div className="sell-wrap" style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          minHeight: "80vh",
          padding: "2rem"
        }}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "0.75rem",
            maxWidth: "500px",
            textAlign: "center",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🚫</div>
            <h2 style={{ margin: "0 0 1rem", color: "#dc2626" }}>
              Cuenta suspendida
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
              {userStatus.banReason}
            </p>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
              Si crees que esto es un error, por favor contacta al soporte.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                marginTop: "1.5rem",
                padding: "0.75rem 1.5rem",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  // ⚠️ NO VERIFICADO
  if (!userStatus.verified) {
    return (
      <>
        <HeaderSimplif />
        <div className="sell-wrap" style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          minHeight: "80vh",
          padding: "2rem"
        }}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "0.75rem",
            maxWidth: "500px",
            textAlign: "center",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
            <h2 style={{ margin: "0 0 1rem", color: "#f59e0b" }}>
              Verificación requerida
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
              Para publicar productos, primero debes verificar tu identidad subiendo una foto de tu cédula.
            </p>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "1.5rem" }}>
              Una vez aprobada tu verificación, podrás publicar sin límites.
            </p>
            <button
              onClick={() => navigate("/perfil")}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Ir a verificar mi identidad
            </button>
          </div>
        </div>
      </>
    );
  }

  // ✅ PUEDE PUBLICAR
  return (
    <>
      <HeaderSimplif />

      <section
        className="sell-wrap"
        style={{
          backgroundImage: "url(/assets/venta.png)",
          backgroundPosition: "center 60%",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#f6f7f9",
          minHeight: "100vh",
        }}
      >
        <div className="bg-overlay" />

        <form className="sell-card" onSubmit={handleSubmit}>
          <div className="card-head">
            <img
              src="/assets/imagen.png"
              alt="La Otra Tribuna"
              className="brand"
            />
            <h2>Vender</h2>
          </div>

          {/* 📸 Imagen */}
          <div className="field">
            <label>Imagen de la publicación</label>
            <label className="upload-box">
              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                hidden
              />
              {preview ? (
                <img src={preview} alt="Vista previa" className="preview" />
              ) : (
                <span>Subir imagen</span>
              )}
            </label>
            <p className="helper muted">Solo una imagen por ahora.</p>
          </div>

          {/* Equipo */}
          <div className="field">
            <label>Equipo</label>
            <input
              type="text"
              placeholder="Ej: Barcelona"
              value={form.equipo}
              onChange={update("equipo")}
              required
            />
          </div>

          {/* Título */}
          <div className="field">
            <label>Título</label>
            <input
              type="text"
              placeholder="Ej: Camiseta Barcelona 24/25"
              value={form.titulo}
              onChange={update("titulo")}
              required
            />
          </div>

          {/* Descripción */}
          <div className="field">
            <label>Descripción</label>
            <textarea
              placeholder="Detalles sobre la camiseta…"
              value={form.descripcion}
              onChange={update("descripcion")}
            />
          </div>

          {/* Precio */}
          <div className="field">
            <label>Precio</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Ej: 3500"
              value={form.precio}
              onChange={update("precio")}
              required
            />
          </div>

          {/* Moneda */}
          <div className="field">
            <label>Moneda</label>
            <select value={form.moneda} onChange={update("moneda")}>
              <option>UYU</option>
              <option>USD</option>
            </select>
          </div>

          {/* Condición */}
          <div className="field">
            <label>Condición</label>
            <select value={form.condicion} onChange={update("condicion")}>
              <option>Nuevo</option>
              <option>Usado</option>
            </select>
          </div>

          {/* Autenticidad */}
          <div className="field">
            <label>Autenticidad</label>
            <select
              value={form.autenticidad}
              onChange={update("autenticidad")}
            >
              <option>Original</option>
              <option>Réplica</option>
            </select>
          </div>

          {/* Talle */}
          <div className="field">
            <label>Talle</label>
            <select value={form.talle} onChange={update("talle")}>
              <option>XS</option>
              <option>S</option>
              <option>M</option>
              <option>L</option>
              <option>XL</option>
              <option>XXL</option>
              <option>XXXL</option>
            </select>
          </div>

          {/* Stock */}
          <div className="field">
            <label>Stock</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Ej: 10"
              value={form.stock}
              onChange={update("stock")}
              required
            />
          </div>

          {/* Categoría (Club / Selección) */}
          <div className="field">
            <label>Categoría</label>
            <div className="category-options">
              <button
                type="button"
                className={form.tipo === "Club" ? "active" : ""}
                onClick={() => setForm((p) => ({ ...p, tipo: "Club" }))}
              >
                Club
              </button>
              <button
                type="button"
                className={form.tipo === "Selección" ? "active" : ""}
                onClick={() => setForm((p) => ({ ...p, tipo: "Selección" }))}
              >
                Selección
              </button>
            </div>
          </div>

          {/* Colección (Actual / Retro) */}
          <div className="field">
            <label>Colección</label>
            <div className="category-options">
              <button
                type="button"
                className={form.coleccion === "Actual" ? "active" : ""}
                onClick={() => setForm((p) => ({ ...p, coleccion: "Actual" }))}
              >
                Actual
              </button>
              <button
                type="button"
                className={form.coleccion === "Retro" ? "active" : ""}
                onClick={() => setForm((p) => ({ ...p, coleccion: "Retro" }))}
              >
                Retro
              </button>
            </div>
          </div>

          {/* Ofertas automáticas */}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.ofertas}
              onChange={update("ofertas")}
            />
            <span>
              <strong>Participar en ofertas automáticas</strong>
              <br />
              Si tu camiseta no se vende en 30 días, se moverá automáticamente
              al apartado de ofertas con 10% de descuento.
            </span>
          </label>

          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? "Publicando…" : "Publicar"}
          </button>
        </form>
      </section>

      {/* Overlay de éxito */}
      {successOpen &&
        createPortal(
          <div className="success-overlay" role="status" aria-live="polite">
            <div className="success-card">
              <div className="success-icon-wrap" aria-hidden="true">
                <svg className="success-icon" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="#16a34a"
                    strokeWidth="1.5"
                    fill="#22c55e22"
                  />
                  <path
                    d="M7 12.5l3.2 3.2L17 9"
                    stroke="#16a34a"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="success-title">{successTitle}</div>
              <div className="success-text">{successText}</div>
              <div className="success-sub">Redirigiendo…</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}