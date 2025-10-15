import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";
import "./Vender.css";

const BUCKET = "publicaciones";

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
    estado: "Activa",
    ofertas: false,
    imagen: null,
    stock: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState("");

  // ===== Modal de éxito =====
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("¡Publicación creada!");
  const [successText, setSuccessText] = useState(
    "Tu publicación se guardó correctamente."
  );

  // ====== Verificar sesión ======
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session;
      if (!sess) {
        const returnTo = encodeURIComponent(
          location.pathname + location.search
        );
        navigate(`/login?return=${returnTo}`, { replace: true });
        return;
      }
      setSessionEmail(sess.user?.email || "");
      setCheckingAuth(false);
    })();
  }, [navigate, location]);

  const update = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
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

      // ✅ 6) ÉXITO: mostrar overlay y redirigir después
      const msg = ofertas
        ? "Tu publicación se guardó correctamente. Si no se vende en 30 días, entrará automáticamente en ofertas (10% OFF)."
        : "Tu publicación se guardó correctamente.";

      setSuccessTitle("¡Publicación creada!");
      setSuccessText(msg);
      setSuccessOpen(true);

      // doble frame para asegurar que se pinte antes de navegar
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

          <div className="field">
            <label>Descripción</label>
            <textarea
              placeholder="Detalles sobre la camiseta…"
              value={form.descripcion}
              onChange={update("descripcion")}
            />
          </div>

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

          <div className="field">
            <label>Moneda</label>
            <select value={form.moneda} onChange={update("moneda")}>
              <option>UYU</option>
              <option>USD</option>
            </select>
          </div>

          <div className="field">
            <label>Condición</label>
            <select value={form.condicion} onChange={update("condicion")}>
              <option>Nuevo</option>
              <option>Usado</option>
            </select>
          </div>

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

          <div className="field">
            <label>Categoría de la publicación</label>
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
              <button
                type="button"
                className={form.tipo === "Retro" ? "active" : ""}
                onClick={() => setForm((p) => ({ ...p, tipo: "Retro" }))}
              >
                Retro
              </button>
            </div>
          </div>

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

      {/* ✅ Overlay de éxito (portal, visible 1.5 s antes de redirigir) */}
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