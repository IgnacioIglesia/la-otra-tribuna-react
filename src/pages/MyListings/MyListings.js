import React, { useEffect, useMemo, useState, useRef } from "react";
import Header from "../../components/Header/Header";
import Dropdown from "../../components/Dropdown/Dropdown";
import { supabase } from "../../lib/supabaseClient";
import "./MyListings.css";

const BUCKET = "publicaciones";
const PLACEHOLDER = "/assets/placeholder.png";

/* ==========================
   Helpers de imágenes
========================== */
// Agrega parámetros de transformación compatibles con Supabase Image Transformations
function withImgParams(url, params = {}) {
  if (!url) return url;
  const qs = new URLSearchParams(params).toString();
  return url + (url.includes("?") ? "&" : "?") + qs;
}

// Convierte/Comprime a WebP (cliente). Si falla, devuelve el file original.
async function compressToWebP(file, { maxW = 1600, maxH = 1600, quality = 0.82 } = {}) {
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    // Escalar manteniendo aspecto
    const scale = Math.min(1, maxW / width, maxH / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((res) =>
      canvas.toBlob(
        (b) => res(b),
        "image/webp",
        quality
      )
    );

    if (!blob) return file; // fallback si el browser no soporta webp

    const webpName = (file.name || "image").replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], webpName, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export default function MyListings() {
  const [user, setUser] = useState(null);
  const [userRow, setUserRow] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edición
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [newImageFile, setNewImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirmación eliminar
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // --- AUTOGROW TEXTAREA ---
  const descRef = useRef(null);
  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    autoGrow(descRef.current);
  }, [editing, form.descripcion]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;
        if (!session) {
          window.location.href = "/login?return=/my-listings";
          return;
        }
        setUser(session.user);

        const { data: u, error: uErr } = await supabase
          .from("usuario")
          .select("id_usuario, email, nombre, apellido")
          .eq("email", session.user.email)
          .maybeSingle();

        if (uErr) throw uErr;
        setUserRow(u || null);

        if (u?.id_usuario) await fetchListings(u.id_usuario);
        else {
          setItems([]);
          setLoading(false);
        }
      } catch (e) {
        console.error("Init error:", e);
        setLoading(false);
        alert("No se pudo obtener tu sesión o tus datos.");
      }
    })();
  }, []);

  async function fetchListings(id_usuario) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("publicacion")
        .select(`
          id_publicacion, id_usuario, id_producto,
          titulo, descripcion, precio, moneda,
          condicion, autenticidad, categoria, coleccion, talle, stock,
          estado, club, permiso_oferta,
          foto ( id_foto, url, orden_foto )
        `)
        .eq("id_usuario", id_usuario)
        .order("id_publicacion", { ascending: false });

      if (error) throw error;

      const sorted = (data || []).sort((a, b) => {
        if (a.estado === "Vendida" && b.estado !== "Vendida") return 1;
        if (a.estado !== "Vendida" && b.estado === "Vendida") return -1;
        return 0;
      });

      setItems(sorted);
    } catch (e) {
      console.error("fetchListings error:", e);
      alert("No se pudieron cargar tus publicaciones.");
    } finally {
      setLoading(false);
    }
  }

  // Formateadores
  const usdMoney = useMemo(
    () => new Intl.NumberFormat("es-UY", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
    []
  );
  const uyuMoney = useMemo(
    () => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }),
    []
  );
  const formatPrice = (precio, moneda) => {
    const amount = Number(precio) || 0;
    if (moneda === "USD") return usdMoney.format(amount).replace("US$", "U$D");
    return uyuMoney.format(amount);
  };

  const openEdit = (pub) => {
    if (pub.estado === "Vendida") {
      alert("No se pueden editar publicaciones vendidas.");
      return;
    }
    setEditing(pub);
    setNewImageFile(null);
    setPreviewUrl("");
    setForm({
      ...pub,
      precio: Number(pub.precio) || 0,
      stock: Number(pub.stock) || 0,
      permiso_oferta: !!pub.permiso_oferta,
      coleccion: pub.coleccion || "Actual",
      categoria: pub.categoria || "Club",
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm({});
    setNewImageFile(null);
    setPreviewUrl("");
  };

  const onChange = (key) => (e) => {
    const el = e.target;
    const value = el.type === "checkbox" ? el.checked : el.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const askDelete = (pub) => {
    if (pub.estado === "Vendida") {
      alert("No se pueden eliminar publicaciones vendidas.");
      return;
    }
    setDeleteConfirm({ id: pub.id_publicacion, titulo: pub.titulo });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !userRow?.id_usuario) return;

    try {
      const { error } = await supabase
        .from("publicacion")
        .delete()
        .eq("id_publicacion", deleteConfirm.id)
        .eq("id_usuario", userRow.id_usuario);

      if (error) {
        console.error("DELETE publicacion error:", error);
        alert("No se pudo borrar la publicación.");
        return;
      }

      setItems((prev) => prev.filter((p) => p.id_publicacion !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (e) {
      console.error("handleDelete error:", e);
      alert("Ocurrió un error al borrar.");
    }
  };

  // Selección de imagen -> convertir a WebP + preview
  const onPickImage = async (file) => {
    if (!file) {
      setNewImageFile(null);
      setPreviewUrl("");
      return;
    }
    const webp = await compressToWebP(file, { maxW: 1600, maxH: 1600, quality: 0.82 });
    setNewImageFile(webp);
    setPreviewUrl(URL.createObjectURL(webp));
  };

  async function handleSave(e) {
    e.preventDefault();
    if (!editing || !userRow?.id_usuario) return;

    setSaving(true);
    try {
      const id_publicacion = editing.id_publicacion;

      // Si cambiaron la imagen, subimos la WebP
      if (newImageFile) {
        const safeName = (newImageFile.name || "foto.webp").replace(/\s+/g, "-");
        const path = `${userRow.id_usuario}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, newImageFile, {
            upsert: false,
            contentType: "image/webp",
          });
        if (upErr) throw upErr;

        const { data: pubUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const rawUrl = pubUrl.publicUrl;

        // Reemplazar/insertar orden_foto = 1
        const { data: foto1, error: fSelErr } = await supabase
          .from("foto")
          .select("id_foto, orden_foto, id_publicacion")
          .eq("id_publicacion", id_publicacion)
          .eq("orden_foto", 1)
          .maybeSingle();
        if (fSelErr) throw fSelErr;

        if (foto1?.id_foto) {
          const { error: upFotoErr } = await supabase
            .from("foto")
            .update({ url: rawUrl })
            .eq("id_foto", foto1.id_foto);
          if (upFotoErr) throw upFotoErr;
        } else {
          const { error: insFotoErr } = await supabase
            .from("foto")
            .insert([{ id_publicacion, url: rawUrl, orden_foto: 1 }]);
          if (insFotoErr) throw insFotoErr;
        }
      }

      // Demás campos
      const payload = {
        titulo: form.titulo?.trim() || editing.titulo,
        descripcion: form.descripcion ?? "",
        precio: Number(form.precio) || 0,
        moneda: form.moneda || "USD",
        condicion: form.condicion || "Nuevo",
        autenticidad: form.autenticidad || "Original",
        categoria: form.categoria || "Club",
        coleccion: form.coleccion || "Actual",
        talle: form.talle || "M",
        stock: Number(form.stock) || 0,
        estado: form.estado || "Activa",
        club: form.club?.trim() || "",
        permiso_oferta: !!form.permiso_oferta,
      };

      const { error: updErr } = await supabase
        .from("publicacion")
        .update(payload)
        .eq("id_publicacion", id_publicacion)
        .eq("id_usuario", userRow.id_usuario);
      if (updErr) throw updErr;

      await fetchListings(userRow.id_usuario);
      closeEdit();
    } catch (err) {
      console.error("handleSave error:", err);
      alert("No se pudieron guardar los cambios. Revisá RLS/Storage si persiste.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />

      <main className="container mylistings">
        <h1>Mis publicaciones</h1>
        <p className="subtitle">Acá podés ver, editar y administrar lo que publicaste.</p>

        {loading ? (
          <p>Cargando…</p>
        ) : items.length === 0 ? (
          <div className="empty-box">Todavía no creaste publicaciones.</div>
        ) : (
          <div className="listings-grid">
            {items.map((p) => {
              const base =
                p.foto?.find((f) => f.orden_foto === 1)?.url ||
                p.foto?.[0]?.url ||
                PLACEHOLDER;

              // ✨ Render en WebP con quality y ancho sugerido
              const img = withImgParams(base, { width: 800, quality: 70, format: "webp" });
              const isVendida = p.estado === "Vendida";

              return (
                <article
                  className={`listing-card ${isVendida ? "listing-card--sold" : ""}`}
                  key={p.id_publicacion}
                >
                  {isVendida && <div className="sold-badge">VENDIDA</div>}

                  <div className="listing-media">
                    <img
                      className="listing-img"
                      src={img}
                      alt={p.titulo}
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER;
                      }}
                      loading="lazy"
                    />
                  </div>

                  <div className="listing-body">
                    <h3 className="listing-title">{p.titulo}</h3>
                    <div className="listing-meta">
                      {(p.club || "—")} • {p.categoria} • {p.coleccion || "Actual"}
                    </div>
                    <div className="listing-price">{formatPrice(p.precio, p.moneda)}</div>
                  </div>

                  <div className="listing-actions">
                    <button className="btn-edit" onClick={() => openEdit(p)} disabled={isVendida}>
                      Editar
                    </button>
                    <button className="btn-delete" onClick={() => askDelete(p)} disabled={isVendida}>
                      Borrar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmación eliminación */}
      {deleteConfirm && (
        <div className="confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3 className="confirm-title">¿Eliminar publicación?</h3>
            <p className="confirm-message">
              ¿Estás seguro que querés eliminar <strong>"{deleteConfirm.titulo}"</strong>?<br />
              Esta acción no se puede deshacer.
            </p>
            <div className="confirm-actions">
              <button className="btn-confirm-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="btn-confirm-delete" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editing && (
        <div className="edit-overlay" onClick={closeEdit}>
          <form className="edit-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h2>Editar publicación</h2>

            <label className="label">Imagen principal</label>
            <label className="upload-box">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickImage(e.target.files?.[0] || null)}
                hidden
              />
              {previewUrl ? (
                <img className="preview" src={previewUrl} alt="Vista previa" />
              ) : (
                <span>Cambiar imagen…</span>
              )}
            </label>

            <div className="grid-2">
              <div>
                <label className="label">Equipo/Club</label>
                <input value={form.club || ""} onChange={onChange("club")} placeholder="Ej: Barcelona" />
              </div>
              <div>
                <label className="label">Categoría</label>
                <Dropdown
                  value={form.categoria || "Club"}
                  onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
                  options={[
                    { value: "Club", label: "Club" },
                    { value: "Seleccion", label: "Selección" },
                  ]}
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label className="label">Colección</label>
                <Dropdown
                  value={form.coleccion || "Actual"}
                  onChange={(v) => setForm((f) => ({ ...f, coleccion: v }))}
                  options={[{ value: "Actual", label: "Actual" }, { value: "Retro", label: "Retro" }]}
                />
              </div>
              <div>
                <label className="label">Talle</label>
                <Dropdown
                  value={form.talle || "M"}
                  onChange={(v) => setForm((f) => ({ ...f, talle: v }))}
                  options={[
                    { value: "XS", label: "XS" },
                    { value: "S", label: "S" },
                    { value: "M", label: "M" },
                    { value: "L", label: "L" },
                    { value: "XL", label: "XL" },
                    { value: "XXL", label: "XXL" },
                    { value: "XXXL", label: "XXXL" },
                  ]}
                />
              </div>
            </div>

            <label className="label">Título</label>
            <input value={form.titulo || ""} onChange={onChange("titulo")} required />

            <label className="label">Descripción</label>
            <textarea
              ref={descRef}
              value={form.descripcion || ""}
              onChange={onChange("descripcion")}
              onInput={(e) => autoGrow(e.target)}
              rows={4}
            />

            <div className="grid-3">
              <div>
                <label className="label">Precio</label>
                <input type="number" value={form.precio} onChange={onChange("precio")} min="0" step="1" required />
              </div>
              <div>
                <label className="label">Moneda</label>
                <Dropdown
                  value={form.moneda || "USD"}
                  onChange={(v) => setForm((f) => ({ ...f, moneda: v }))}
                  options={[{ value: "USD", label: "USD" }, { value: "UYU", label: "UYU" }]}
                />
              </div>
              <div>
                <label className="label">Stock</label>
                <input type="number" value={form.stock} onChange={onChange("stock")} min="0" step="1" required />
              </div>
            </div>

            <div className="grid-3">
              <div>
                <label className="label">Condición</label>
                <Dropdown
                  value={form.condicion || "Nuevo"}
                  onChange={(v) => setForm((f) => ({ ...f, condicion: v }))}
                  options={[{ value: "Nuevo", label: "Nuevo" }, { value: "Usado", label: "Usado" }]}
                />
              </div>
              <div>
                <label className="label">Autenticidad</label>
                <Dropdown
                  value={form.autenticidad || "Original"}
                  onChange={(v) => setForm((f) => ({ ...f, autenticidad: v }))}
                  options={[{ value: "Original", label: "Original" }, { value: "Réplica", label: "Réplica" }]}
                />
              </div>
            </div>

            <label className="checkbox">
              <input type="checkbox" checked={!!form.permiso_oferta} onChange={onChange("permiso_oferta")} />
              <span>
                <strong>Participar en ofertas automáticas</strong>
                <small>Si no se vende en 30 días, aplicamos 10% de descuento.</small>
              </span>
            </label>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={closeEdit} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
