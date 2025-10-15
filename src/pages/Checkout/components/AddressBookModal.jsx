// src/pages/Checkout/components/AddressBookModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function AddressBookModal({
  open,
  onClose,
  idUsuario,
  addresses,
  selectedId,
  onChangeSelected,
  onRefresh,
}) {
  const [mode, setMode] = useState("list"); // list | add | edit
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    pais: "Uruguay",
    departamento: "",
    ciudad: "",
    calle: "",
    numero: "",
    cp: "",
    is_default: false,
  });

  // modal confirmación
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (!open) {
      setMode("list");
      setEditing(null);
      setForm({
        pais: "Uruguay",
        departamento: "",
        ciudad: "",
        calle: "",
        numero: "",
        cp: "",
        is_default: false,
      });
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  }, [open]);

  const selected = useMemo(
    () => addresses.find((a) => a.id_direccion === selectedId) || null,
    [addresses, selectedId]
  );

  const update = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const startAdd = () => {
    setEditing(null);
    setForm({
      pais: "Uruguay",
      departamento: "",
      ciudad: "",
      calle: "",
      numero: "",
      cp: "",
      is_default: addresses.length === 0,
    });
    setMode("add");
  };

  const startEdit = (addr) => {
    setEditing(addr);
    setForm({
      pais: addr.pais || "Uruguay",
      departamento: addr.departamento || "",
      ciudad: addr.ciudad || "",
      calle: addr.calle || "",
      numero: addr.numero || "",
      cp: addr.cp || "",
      is_default: !!addr.is_default,
    });
    setMode("edit");
  };

  const cancelForm = () => {
    setMode("list");
    setEditing(null);
  };

  async function setDefault(id_direccion) {
    const { error: e1 } = await supabase
      .from("direccion")
      .update({ is_default: false })
      .eq("id_usuario", idUsuario);
    if (e1) {
      alert("No se pudo actualizar la dirección principal.");
      return;
    }
    const { error: e2 } = await supabase
      .from("direccion")
      .update({ is_default: true })
      .eq("id_direccion", id_direccion);
    if (e2) {
      alert("No se pudo establecer como principal.");
      return;
    }
    await onRefresh();
  }

  // abrir confirmación custom
  const askRemove = (id_direccion) => {
    setPendingDelete(id_direccion);
    setConfirmOpen(true);
  };

  // ejecutar borrado luego de confirmar
  const doRemove = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase
      .from("direccion")
      .delete()
      .eq("id_direccion", pendingDelete);
    if (error) {
      alert("No se pudo eliminar.");
      return;
    }
    setConfirmOpen(false);
    setPendingDelete(null);
    await onRefresh();
  };

  async function submitAdd(e) {
    e.preventDefault();
    const payload = {
      id_usuario: idUsuario,
      pais: form.pais || "Uruguay",
      departamento: form.departamento,
      ciudad: form.ciudad,
      calle: form.calle,
      numero: form.numero || null,
      cp: form.cp || null,
      is_default: !!form.is_default,
    };
    if (payload.is_default) {
      const { error: e1 } = await supabase
        .from("direccion")
        .update({ is_default: false })
        .eq("id_usuario", idUsuario);
      if (e1) return alert("No se pudo preparar la dirección principal.");
    }
    const { error } = await supabase.from("direccion").insert([payload]);
    if (error) return alert("No se pudo agregar la dirección.");
    await onRefresh();
    setMode("list");
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      pais: form.pais || "Uruguay",
      departamento: form.departamento,
      ciudad: form.ciudad,
      calle: form.calle,
      numero: form.numero || null,
      cp: form.cp || null,
      is_default: !!form.is_default,
    };
    if (payload.is_default) {
      const { error: e1 } = await supabase
        .from("direccion")
        .update({ is_default: false })
        .eq("id_usuario", idUsuario);
      if (e1) return alert("No se pudo preparar la dirección principal.");
    }
    const { error } = await supabase
      .from("direccion")
      .update(payload)
      .eq("id_direccion", editing.id_direccion);
    if (error) return alert("No se pudo editar la dirección.");
    await onRefresh();
    setMode("list");
    setEditing(null);
  }

  if (!open) return null;

  return (
    <div className="addr-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="addr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="addr-modal-head">
          <h3 className="addr-title">
            {mode === "list" && "Direcciones de envío"}
            {mode === "add" && "Agregar dirección"}
            {mode === "edit" && "Editar dirección"}
          </h3>
          <button className="addr-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {mode === "list" && (
          <div className="addr-list">
            {addresses.length === 0 ? (
              <div className="muted">No tenés direcciones guardadas.</div>
            ) : (
              addresses.map((a) => (
                <div key={a.id_direccion} className={`addr-item ${a.id_direccion === selectedId ? "is-selected" : ""}`}>
                  <label className="addr-radio">
                    <input
                      type="radio"
                      name="seladdr"
                      checked={a.id_direccion === selectedId}
                      onChange={() => onChangeSelected(a)}
                    />
                    <div>
                      <div className="addr-line">
                        {a.calle}
                        {a.numero ? ` ${a.numero}` : ""},{" "}
                        {a.ciudad}, {a.departamento}
                      </div>
                      <div className="muted xs">
                        {a.cp ? `CP ${a.cp} · ` : ""}
                        {a.pais}
                        {a.is_default ? " · Principal" : ""}
                      </div>
                    </div>
                  </label>
                  <div className="addr-actions">
                    {!a.is_default && (
                      <button className="btn-sm" onClick={() => setDefault(a.id_direccion)}>
                        Hacer principal
                      </button>
                    )}
                    <button className="btn-sm" onClick={() => startEdit(a)}>
                      Editar
                    </button>
                    <button className="btn-sm danger" onClick={() => askRemove(a.id_direccion)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="addr-footer">
              <button className="btn" onClick={startAdd}>Agregar nueva</button>
              <button
                className="btn primary"
                onClick={() => {
                  const sel = addresses.find((a) => a.id_direccion === selectedId) || null;
                  if (!sel) return alert("Seleccioná una dirección para continuar.");
                  onChangeSelected(sel);
                  onClose();
                }}
              >
                Usar esta dirección
              </button>
            </div>
          </div>
        )}

        {(mode === "add" || mode === "edit") && (
          <form className="addr-form" onSubmit={mode === "add" ? submitAdd : submitEdit}>
            <div className="grid-2">
              <div className="f">
                <label>País</label>
                <select value={form.pais} onChange={update("pais")}>
                  <option>Uruguay</option>
                </select>
              </div>
              <div className="f">
                <label>Departamento</label>
                <input value={form.departamento} onChange={update("departamento")} required />
              </div>
            </div>

            <div className="grid-2">
              <div className="f">
                <label>Ciudad</label>
                <input value={form.ciudad} onChange={update("ciudad")} required />
              </div>
              <div className="f">
                <label>Código postal</label>
                <input value={form.cp} onChange={update("cp")} />
              </div>
            </div>

            <div className="grid-2">
              <div className="f">
                <label>Calle</label>
                <input value={form.calle} onChange={update("calle")} required />
              </div>
              <div className="f">
                <label>Nº puerta</label>
                <input value={form.numero} onChange={update("numero")} />
              </div>
            </div>

            <label className="checkline">
              <input type="checkbox" checked={!!form.is_default} onChange={update("is_default")} />
              <span>Establecer como principal</span>
            </label>

            <div className="addr-footer">
              <button type="button" className="btn" onClick={cancelForm}>
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Guardar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal de confirmación */}
      {confirmOpen && (
        <div className="confirm-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <h4>Eliminar dirección</h4>
            <p className="muted" style={{ marginTop: 6 }}>
              ¿Seguro que querés eliminar esta dirección? Esta acción no se puede deshacer.
            </p>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button className="btn danger" onClick={doRemove}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}