// src/pages/MyListings/MyListings.js
import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header/Header";
import { supabase } from "../../lib/supabaseClient";
import "./MyListings.css";

const BUCKET = "publicaciones";
const PLACEHOLDER = "/assets/placeholder.png";

export default function MyListings() {
  const [user, setUser] = useState(null);
  const [userRow, setUserRow] = useState(null); // { id_usuario }
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edición
  const [editing, setEditing] = useState(null); // publicacion completa
  const [form, setForm] = useState({});
  const [newImageFile, setNewImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // ===== sesión + carga =====
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

        // buscar id_usuario por email
        const { data: u, error: uErr } = await supabase
          .from("usuario")
          .select("id_usuario, email, nombre, apellido")
          .eq("email", session.user.email)
          .maybeSingle();

        if (uErr) throw uErr;
        if (!u?.id_usuario) {
          console.warn("No se encontró fila en 'usuario' para", session.user.email);
        }
        setUserRow(u || null);

        if (u?.id_usuario) {
          await fetchListings(u.id_usuario);
        } else {
          setItems([]);
          setLoading(false);
        }
      } catch (e) {
        console.error("Error al inicializar sesión/listados:", e);
        setLoading(false);
        alert("No se pudo obtener tu sesión o tus datos de usuario.");
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
          condicion, autenticidad, categoria, talle, stock,
          estado, club, permiso_oferta,
          foto ( id_foto, url, orden_foto )
        `)
        .eq("id_usuario", id_usuario)
        .order("id_publicacion", { ascending: false });

      if (error) throw error;
      
      // Ordenar: primero las activas, luego las vendidas
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

  // ===== helpers =====
  const uyMoney = useMemo(
    () =>
      new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
        maximumFractionDigits: 0,
      }),
    []
  );

  const openEdit = (pub) => {
    // No permitir editar publicaciones vendidas
    if (pub.estado === "Vendida") {
      alert("No se pueden editar publicaciones vendidas.");
      return;
    }
    
    setEditing(pub);
    setNewImageFile(null);
    setForm({
      ...pub,
      precio: Number(pub.precio) || 0,
      stock: Number(pub.stock) || 0,
      permiso_oferta: !!pub.permiso_oferta,
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm({});
    setNewImageFile(null);
  };

  const onChange = (key) => (e) => {
    const el = e.target;
    const value = el.type === "checkbox" ? el.checked : el.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // ===== eliminar =====
  const handleDelete = async (id_publicacion, estado) => {
    if (!userRow?.id_usuario) return;
    
    // No permitir eliminar publicaciones vendidas
    if (estado === "Vendida") {
      alert("No se pueden eliminar publicaciones vendidas.");
      return;
    }
    
    if (!window.confirm("¿Seguro que querés borrar esta publicación?")) return;

    try {
      const { error } = await supabase
        .from("publicacion")
        .delete()
        .eq("id_publicacion", id_publicacion)
        .eq("id_usuario", userRow.id_usuario); // ayuda a policy

      if (error) {
        console.error("DELETE publicacion error:", error);
        alert("No se pudo borrar la publicación.");
        return;
      }
      setItems((prev) => prev.filter((p) => p.id_publicacion !== id_publicacion));
    } catch (e) {
      console.error("handleDelete error:", e);
      alert("Ocurrió un error al borrar.");
    }
  };

  // ===== guardar edición =====
  async function handleSave(e) {
    e.preventDefault();
    if (!editing || !userRow?.id_usuario) return;

    setSaving(true);
    try {
      const id_publicacion = editing.id_publicacion;

      // 1) si hay imagen nueva => subir al bucket y actualizar/insertar fila foto (orden 1)
      if (newImageFile) {
        // subimos al storage
        const safeName = newImageFile.name?.replace(/\s+/g, "-") || "foto.jpg";
        const path = `${userRow.id_usuario}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, newImageFile, {
            upsert: false,
            contentType: newImageFile.type || "image/jpeg",
          });

        if (upErr) {
          console.error("Storage upload error:", upErr);
          throw upErr;
        }

        const { data: pubUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const url = pubUrl.publicUrl;

        // ¿existe la foto orden 1?
        const { data: foto1, error: fSelErr } = await supabase
          .from("foto")
          .select("id_foto, orden_foto, id_publicacion")
          .eq("id_publicacion", id_publicacion)
          .eq("orden_foto", 1)
          .maybeSingle();

        if (fSelErr) {
          console.error("Select foto error:", fSelErr);
          throw fSelErr;
        }

        if (foto1?.id_foto) {
          const { error: upFotoErr } = await supabase
            .from("foto")
            .update({ url })
            .eq("id_foto", foto1.id_foto);

          if (upFotoErr) {
            console.error("Update foto error:", upFotoErr);
            throw upFotoErr;
          }
        } else {
          const { error: insFotoErr } = await supabase
            .from("foto")
            .insert([{ id_publicacion, url, orden_foto: 1 }]);

          if (insFotoErr) {
            console.error("Insert foto error:", insFotoErr);
            throw insFotoErr;
          }
        }
      }

      // 2) actualizar publicacion (usar defaults seguros)
      const payload = {
        titulo: form.titulo?.trim() || editing.titulo,
        descripcion: form.descripcion ?? "",
        precio: Number(form.precio) || 0,
        moneda: form.moneda || "UYU",
        condicion: form.condicion || "Nuevo",
        autenticidad: form.autenticidad || "Original",
        categoria: form.categoria || "Club",
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
        .eq("id_usuario", userRow.id_usuario); // MUY IMPORTANTE p/ policy

      if (updErr) {
        console.error("UPDATE publicacion error:", updErr);
        throw updErr;
      }

      // 3) refrescar lista
      await fetchListings(userRow.id_usuario);
      closeEdit();
    } catch (err) {
      console.error("handleSave error:", err);
      alert("No se pudieron guardar los cambios. Revisá las políticas RLS y permisos de Storage si el error persiste.");
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
              const img =
                p.foto?.find((f) => f.orden_foto === 1)?.url ||
                p.foto?.[0]?.url ||
                PLACEHOLDER;
              
              const isVendida = p.estado === "Vendida";

              return (
                <article 
                  className={`listing-card ${isVendida ? 'listing-card--sold' : ''}`} 
                  key={p.id_publicacion}
                >
                  {isVendida && (
                    <div className="sold-badge">VENDIDA</div>
                  )}
                  
                  <div className="listing-media">
                    <img
                      className="listing-img"
                      src={img}
                      alt={p.titulo}
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER;
                      }}
                    />
                  </div>

                  <div className="listing-body">
                    <h3 className="listing-title">{p.titulo}</h3>
                    <div className="listing-meta">
                      {(p.club || "—")} • {p.categoria}
                    </div>
                    <div className="listing-price">
                      {p.moneda} {uyMoney.format(Number(p.precio)).replace("UYU ", "")}
                    </div>
                  </div>

                  <div className="listing-actions">
                    <button 
                      className="btn-edit" 
                      onClick={() => openEdit(p)}
                      disabled={isVendida}
                      style={isVendida ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(p.id_publicacion, p.estado)}
                      disabled={isVendida}
                      style={isVendida ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      Borrar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ===== Modal de edición ===== */}
      {editing && (
        <div className="edit-overlay" onClick={closeEdit}>
          <form
            className="edit-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
          >
            <h2>Editar publicación</h2>

            {/* Imagen */}
            <label className="label">Imagen principal</label>
            <label className="upload-box">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                hidden
              />
              {newImageFile ? (
                <img
                  className="preview"
                  src={URL.createObjectURL(newImageFile)}
                  alt="Vista previa"
                />
              ) : (
                <span>Cambiar imagen…</span>
              )}
            </label>

            <div className="grid-2">
              <div>
                <label className="label">Equipo/Club</label>
                <input
                  value={form.club || ""}
                  onChange={onChange("club")}
                  placeholder="Ej: Barcelona"
                />
              </div>
              <div>
                <label className="label">Categoría</label>
                <select value={form.categoria || "Club"} onChange={onChange("categoria")}>
                  <option>Club</option>
                  <option>Selección</option>
                  <option>Retro</option>
                </select>
              </div>
            </div>

            <label className="label">Título</label>
            <input value={form.titulo || ""} onChange={onChange("titulo")} required />

            <label className="label">Descripción</label>
            <textarea value={form.descripcion || ""} onChange={onChange("descripcion")} />

            <div className="grid-3">
              <div>
                <label className="label">Precio</label>
                <input
                  type="number"
                  value={form.precio}
                  onChange={onChange("precio")}
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div>
                <label className="label">Moneda</label>
                <select value={form.moneda || "UYU"} onChange={onChange("moneda")}>
                  <option>UYU</option>
                  <option>USD</option>
                </select>
              </div>
              <div>
                <label className="label">Stock</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={onChange("stock")}
                  min="0"
                  step="1"
                  required
                />
              </div>
            </div>

            <div className="grid-3">
              <div>
                <label className="label">Condición</label>
                <select value={form.condicion || "Nuevo"} onChange={onChange("condicion")}>
                  <option>Nuevo</option>
                  <option>Usado</option>
                </select>
              </div>
              <div>
                <label className="label">Autenticidad</label>
                <select
                  value={form.autenticidad || "Original"}
                  onChange={onChange("autenticidad")}
                >
                  <option>Original</option>
                  <option>Réplica</option>
                </select>
              </div>
              <div>
                <label className="label">Talle</label>
                <select value={form.talle || "M"} onChange={onChange("talle")}>
                  <option>XS</option>
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                  <option>XXL</option>
                  <option>XXXL</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label className="label">Estado</label>
                <select value={form.estado || "Activa"} onChange={onChange("estado")}>
                  <option>Activa</option>
                  <option>Vendida</option>
                </select>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!form.permiso_oferta}
                  onChange={onChange("permiso_oferta")}
                />
                <span>
                  <strong>Participar en ofertas automáticas</strong>
                  <small>Si no se vende en 30 días, aplicamos 10% de descuento.</small>
                </span>
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={closeEdit}
                disabled={saving}
              >
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