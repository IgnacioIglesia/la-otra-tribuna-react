// src/pages/Checkout/Checkout.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { useCart } from "../../components/Cart/CartContext";
import { supabase } from "../../lib/supabaseClient";
import AddressBookModal from "./components/AddressBookModal.jsx";
import "./Checkout.css";

/* =========================
   Utilidades y helpers
   ========================= */
const money = (n, currency = "USD") => {
  const amount = Number(n) || 0;
  const currencyToUse = currency || "USD";

  if (currencyToUse === "USD") {
    const formatted = new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
    return formatted.replace("US$", "U$D");
  }

  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: currencyToUse,
    maximumFractionDigits: 0,
  }).format(amount);
};

const onlyDigits = (s) => (s || "").replace(/\D+/g, "");

const formatCardNumber = (v) => {
  const digits = onlyDigits(v).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

const formatExp = (v) => {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

const validateCard = (card) => {
  if (!card.name.trim()) return "Completá el nombre y apellido del titular.";

  const digits = onlyDigits(card.number);
  if (digits.length !== 16) {
    return "El número de tarjeta debe tener exactamente 16 dígitos.";
  }

  if (!/^\d{2}\/\d{2}$/.test(card.exp)) return "Vencimiento inválido (MM/AA).";
  const [mmStr, yyStr] = card.exp.split("/");
  const mm = parseInt(mmStr, 10);
  const yy = parseInt(yyStr, 10);
  if (Number.isNaN(mm) || Number.isNaN(yy) || mm < 1 || mm > 12) {
    return "Mes de vencimiento inválido.";
  }

  const now = new Date();
  const curYear = now.getFullYear() % 100;
  const curMonth = now.getMonth() + 1;
  if (yy < curYear || (yy === curYear && mm < curMonth)) {
    return "La tarjeta está vencida.";
  }

  if (!/^\d{3}$/.test(card.cvc)) return "CVC inválido (debe tener 3 dígitos).";

  return null;
};

/* =========================
   Modal centrado
   ========================= */
function CenteredModal({ open, type = "info", title, children, onClose, primaryAction }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="ck-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="ck-modal"
        style={{
          width: "min(520px, 92vw)",
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
          padding: "20px 20px 16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 24 }}>
            {type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️"}
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>
            {title}
          </h3>
        </div>
        <div style={{ color: "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {children}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#111827",
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cerrar
          </button>
          {primaryAction}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Página Principal
   ========================= */
export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clear, paymentCurrency, convertPrice, remove, setQty } = useCart();

  const [email, setEmail] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");

  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvc: "" });

  // ✅ Términos + Transferencia (comprobante)
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [transferFile, setTransferFile] = useState(null);
  const [transferPreview, setTransferPreview] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedProof, setUploadedProof] = useState(null); // { url, path, name }
  const fileInputRef = useRef(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("info");
  const [modalTitle, setModalTitle] = useState("");
  const [modalText, setModalText] = useState("");

  const totalFinal = useMemo(() => total, [total]);

  // ⛔ listado de ítems no disponibles
  const [unavailable, setUnavailable] = useState([]);

  const removeItem = (id) => {
    if (typeof remove === "function") remove(id);
    else if (typeof setQty === "function") setQty(id, 0);
  };

  // Carga de sesión y usuario
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const sess = data?.session;
        if (!sess) {
          const backTo = encodeURIComponent("/checkout");
          navigate(`/login?return=${backTo}`, { replace: true });
          return;
        }
        setEmail(sess.user?.email || "");

        const { data: u, error: uErr } = await supabase
          .from("usuario")
          .select("id_usuario, nombre, apellido, email, esta_baneado, razon_baneo")
          .eq("email", sess.user?.email)
          .maybeSingle();
        if (uErr) throw uErr;

        if (!u) {
          setModalType("error");
          setModalTitle("Usuario no encontrado");
          setModalText("No se encontró tu cuenta. Volvé a iniciar sesión.");
          setModalOpen(true);
          return;
        }

        setUsuario(u);

        if (u.esta_baneado) {
          setIsBanned(true);
          setBanReason(u.razon_baneo || "Tu cuenta ha sido suspendida.");
          setLoading(false);
          return;
        }

        if (u.id_usuario) {
          await fetchAddresses(u.id_usuario);
        }
      } catch (err) {
        console.error(err);
        setModalType("error");
        setModalTitle("Error de sesión");
        setModalText("Error al cargar tu sesión. Intentá nuevamente.");
        setModalOpen(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function fetchAddresses(id_usuario) {
    const { data: list, error } = await supabase
      .from("direccion")
      .select(
        "id_direccion, pais, departamento, ciudad, calle, numero, cp, is_default, created_at"
      )
      .eq("id_usuario", id_usuario)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setAddresses([]);
      setSelected(null);
      return;
    }
    setAddresses(list || []);
    setSelected((list || [])[0] || null);
  }

  const onChangeCard = (key) => (e) => {
    let v = e.target.value;
    if (key === "number") v = formatCardNumber(v);
    if (key === "exp") v = formatExp(v);
    if (key === "cvc") v = onlyDigits(v).slice(0, 3);
    setCard((c) => ({ ...c, [key]: v }));
  };

  // Verificar disponibilidad
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!items?.length) {
        if (isMounted) setUnavailable([]);
        return;
      }
      try {
        const ids = items.map((i) => i.id);
        const { data: pubs, error } = await supabase
          .from("publicacion")
          .select("id_publicacion, titulo, stock, estado")
          .in("id_publicacion", ids);

        if (error) throw error;

        const issues = [];
        for (const it of items) {
          const pub = pubs?.find((p) => p.id_publicacion === it.id);
          if (!pub) {
            issues.push({ id: it.id, titulo: it.nombre, motivo: "No encontrada" });
            continue;
          }
          if (pub.estado !== "Activa") {
            issues.push({ id: it.id, titulo: pub.titulo, motivo: "No disponible" });
            continue;
          }
          if (it.qty > (pub.stock ?? 0)) {
            issues.push({
              id: it.id,
              titulo: pub.titulo,
              motivo: `Stock insuficiente (quedan ${pub.stock ?? 0})`,
            });
          }
        }
        if (isMounted) setUnavailable(issues);
      } catch (e) {
        console.error("Error verificando disponibilidad:", e);
        if (isMounted) setUnavailable([]);
      }
    })();
    return () => { isMounted = false; };
  }, [items]);

  const notificarVendedor = async (publicacionId, cantidad, compradorNombre, idPedido) => {
    try {
      const { data: publicacion, error: pubError } = await supabase
        .from("publicacion")
        .select(`id_usuario, titulo`)
        .eq("id_publicacion", publicacionId)
        .single();

      if (pubError) throw pubError;

      const { error: notifError } = await supabase
        .from("notificacion")
        .insert({
          id_usuario: publicacion.id_usuario,
          tipo: "venta",
          titulo: "¡Nueva venta! 🎉",
          mensaje: `${compradorNombre} compró ${cantidad} unidad(es) de "${publicacion.titulo}"`,
          id_pedido: idPedido,
          id_publicacion: publicacionId,
          leida: false
        });

      if (notifError) {
        console.error("Error al crear notificación:", notifError);
        throw notifError;
      }
    } catch (error) {
      console.error("Error al notificar vendedor:", error);
    }
  };

  // ====== Soporte de comprobante (transferencia)
  const handleProofChange = (e) => {
    const f = e.target.files?.[0] || null;
    setTransferFile(f);
    setUploadedProof(null);
    setUploadProgress(0);
    if (f && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setTransferPreview(url);
    } else {
      setTransferPreview(null);
    }
  };

  const removeProof = () => {
    setTransferFile(null);
    setTransferPreview(null);
    setUploadedProof(null);
    setUploadProgress(0);
    setUploadingProof(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function uploadComprobante(userId) {
    if (!transferFile) return null;

    // bucket sugerido: 'comprobantes'
    const bucket = supabase.storage.from("comprobantes");
    const ts = Date.now();
    const safeName = transferFile.name?.replace(/[^\w.\-]+/g, "_") || `comprobante_${ts}`;
    const path = `${userId}/${ts}_${safeName}`;

    // (Supabase no expone progreso real del upload)
    setUploadingProof(true);
    setUploadProgress(20);

    const { error: upErr } = await bucket.upload(path, transferFile, {
      cacheControl: "3600",
      upsert: true,
      contentType: transferFile.type || undefined,
    });

    if (upErr) {
      setUploadingProof(false);
      throw upErr;
    }

    setUploadProgress(80);

    const { data: pub } = bucket.getPublicUrl(path);
    const url = pub?.publicUrl || null;

    setUploadProgress(100);
    setUploadingProof(false);
    const result = { url, path, name: safeName };
    setUploadedProof(result);
    return result;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!acceptedTerms) {
      setModalType("error");
      setModalTitle("Términos requeridos");
      setModalText("Debes aceptar los términos para continuar con tu pedido.");
      setModalOpen(true);
      return;
    }

    if (items.length === 0) {
      setModalType("error");
      setModalTitle("Carrito vacío");
      setModalText("Tu carrito está vacío.");
      setModalOpen(true);
      return;
    }

    if (unavailable.length > 0) {
      setModalType("error");
      setModalTitle("Hay ítems no disponibles");
      setModalText(
        `No podés confirmar la compra mientras haya ítems no disponibles.\n\nRevisá:\n- ${unavailable.map(u => `${u.titulo} — ${u.motivo}`).join("\n- ")}`
      );
      setModalOpen(true);
      return;
    }

    if (!selected) {
      setModalType("error");
      setModalTitle("Dirección requerida");
      setModalText("Seleccioná una dirección de entrega.");
      setModalOpen(true);
      return;
    }

    // Validaciones según método
    if (method === "card") {
      const err = validateCard(card);
      if (err) {
        setModalType("error");
        setModalTitle("Datos de tarjeta");
        setModalText(err);
        setModalOpen(true);
        return;
      }
    } else if (method === "transfer") {
      if (!transferFile && !uploadedProof) {
        setModalType("error");
        setModalTitle("Comprobante requerido");
        setModalText("Subí una imagen o PDF del comprobante de la transferencia para poder confirmar el pedido.");
        setModalOpen(true);
        return;
      }
    }

    if (!usuario?.id_usuario) {
      setModalType("error");
      setModalTitle("Usuario no identificado");
      setModalText("Volvé a iniciar sesión.");
      setModalOpen(true);
      return;
    }

    try {
      setLoading(true);

      // Verificación de stock justo antes
      const stockChecks = await Promise.all(
        items.map(async (item) => {
          const { data: pub, error } = await supabase
            .from("publicacion")
            .select("id_publicacion, titulo, stock, estado")
            .eq("id_publicacion", item.id)
            .single();

          if (error) throw error;

          return {
            id: item.id,
            titulo: pub.titulo,
            stockDisponible: pub.stock,
            cantidadSolicitada: item.qty,
            estado: pub.estado,
          };
        })
      );

      const sinStock = stockChecks.filter(
        (check) => check.cantidadSolicitada > check.stockDisponible || check.estado !== "Activa"
      );

      if (sinStock.length > 0) {
        const mensajes = sinStock.map(
          (item) =>
            `• ${item.titulo}: ${
              item.estado !== "Activa" ? "No disponible" : `Solo quedan ${item.stockDisponible} unidad(es)`
            }`
        );
        setModalType("error");
        setModalTitle("Stock insuficiente");
        setModalText(`No hay stock suficiente para:\n${mensajes.join("\n")}\n\nActualizá tu carrito.`);
        setModalOpen(true);
        setLoading(false);
        return;
      }

      // Subir comprobante si corresponde
      let proof = uploadedProof;
      if (method === "transfer" && !proof) {
        proof = await uploadComprobante(usuario.id_usuario);
        if (!proof?.url) throw new Error("No se pudo obtener la URL del comprobante.");
      }

      const pedidosCreados = [];

      for (const item of items) {
        const precioOriginal = Number(item.precio) || 0;
        const precioConvertido = convertPrice(precioOriginal, item.moneda);
        const totalItem = precioConvertido * item.qty;

        const { data: pedido, error: pedidoError } = await supabase
          .from("pedido")
          .insert({
            id_usuario: usuario.id_usuario,
            id_publicacion: item.id,
            cantidad: item.qty,
            precio_unitario: precioConvertido,
            total: totalItem,
            estado: "pendiente",
            id_direccion: selected.id_direccion,
            metodo_pago: method,
            comprobante_url: proof?.url || null,
            comprobante_nombre: proof?.name || null,
          })
          .select()
          .single();

        if (pedidoError) throw pedidoError;
        pedidosCreados.push(pedido);

        await notificarVendedor(
          item.id,
          item.qty,
          `${usuario.nombre} ${usuario.apellido}`.trim() || "Un comprador",
          pedido.id_pedido
        );

        // Actualizar stock
        const { data: pubActual, error: stockError } = await supabase
          .from("publicacion")
          .select("stock")
          .eq("id_publicacion", item.id)
          .single();
        if (stockError) throw stockError;

        const nuevoStock = pubActual.stock - item.qty;

        if (nuevoStock <= 0) {
          const { error: updateError } = await supabase
            .from("publicacion")
            .update({ stock: 0, estado: "Vendida" })
            .eq("id_publicacion", item.id);
          if (updateError) console.error("Error al marcar publicación como Vendida:", updateError);
        } else {
          const { error: updateError } = await supabase
            .from("publicacion")
            .update({ stock: nuevoStock })
            .eq("id_publicacion", item.id);
          if (updateError) throw updateError;
        }
      }

      window.dispatchEvent(
        new CustomEvent("new-notification", {
          detail: {
            tipo: "compra",
            titulo: "Pedido confirmado",
            mensaje: `Tu pedido de ${items.length} producto(s) fue confirmado exitosamente`,
            fecha: new Date().toISOString(),
            leida: false
          }
        })
      );

      clear();
      removeProof();

      setModalType("success");
      setModalTitle("¡Pedido confirmado! 🎉");
      setModalText(
        `Se ${pedidosCreados.length === 1 ? "creó" : "crearon"} ${pedidosCreados.length} pedido(s).\n\nRecordá que la acreditación por transferencia puede demorar hasta 24 h hábiles.`
      );
      setModalOpen(true);
    } catch (error) {
      console.error("Error al procesar el pedido:", error);
      setModalType("error");
      setModalTitle("Error al procesar");
      setModalText(
        `No pudimos completar tu pedido:\n${error.message || String(error)}\n\nIntentá nuevamente o contactá soporte.`
      );
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (isBanned) {
    return (
      <>
        <Header />
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "70vh",
            padding: "2rem",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "3rem 2rem",
              borderRadius: "1rem",
              maxWidth: "500px",
              textAlign: "center",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              border: "1px solid #fee2e2",
            }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🚫</div>
            <h2 style={{ margin: "0 0 1rem", color: "#dc2626", fontSize: "1.5rem" }}>
              Cuenta suspendida
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: 1.6 }}>
              {banReason}
            </p>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "2rem" }}>
              No podés realizar compras mientras tu cuenta esté suspendida.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "0.75rem 2rem",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  if (loading && !modalOpen) {
    return (
      <>
        <Header />
        <div className="container" style={{ padding: "48px 0", textAlign: "center" }}>
          Cargando…
        </div>
      </>
    );
  }

  const blockedByUnavailable = unavailable.length > 0;
  const transferNeedsProof = method === "transfer" && !uploadedProof && !transferFile;

  return (
    <>
      <Header />
      <main className="container checkout">
        <h1 className="ck-title">Finalizar compra</h1>

        <form className="ck-grid" onSubmit={handleSubmit}>
          <section className="ck-col">
            {/* Datos del comprador */}
            <div className="ck-card">
              <h2 className="ck-h2">Datos del comprador</h2>
              <div className="ck-row">
                <div className="ck-field">
                  <label htmlFor="ck-email">Email</label>
                  <input id="ck-email" value={email} readOnly />
                </div>
                <div className="ck-field">
                  <label htmlFor="ck-name">Nombre</label>
                  <input
                    id="ck-name"
                    value={`${usuario?.nombre || ""} ${usuario?.apellido || ""}`.trim()}
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="ck-card">
              <div className="ck-card-head">
                <h2 className="ck-h2">Dirección de entrega</h2>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setAddressOpen(true)}
                >
                  Cambiar
                </button>
              </div>

              {selected ? (
                <>
                  <div className="addr-line">
                    {selected.calle}
                    {selected.numero ? ` ${selected.numero}` : ""},{" "}
                    {selected.ciudad}, {selected.departamento}
                  </div>
                  <div className="muted">
                    {selected.cp ? `CP ${selected.cp} · ` : ""}
                    {selected.pais}
                    {selected.is_default ? " · Principal" : ""}
                  </div>
                </>
              ) : (
                <div className="muted">
                  No encontramos una dirección. Agregá una para continuar.
                </div>
              )}
            </div>

            {/* Pago */}
            <div className="ck-card">
              <h2 className="ck-h2">Método de pago</h2>

              <div className="ck-pay-list">
                {/* TARJETA */}
                <div className={`pay-item ${method === "card" ? "open" : ""}`}>
                  <label className="pay-head">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={method === "card"}
                      onChange={() => setMethod("card")}
                    />
                    <span>Tarjeta de crédito / débito</span>
                    <span className="pay-icons" aria-hidden>💳</span>
                  </label>

                  {method === "card" && (
                    <div className="pay-body">
                      <div className="ck-field">
                        <label htmlFor="cc-name">Nombre y apellido del titular</label>
                        <input
                          id="cc-name"
                          type="text"
                          placeholder="Como aparece en la tarjeta"
                          value={card.name}
                          onChange={onChangeCard("name")}
                          required
                        />
                      </div>

                      <div className="ck-field">
                        <label htmlFor="cc-number">Número de tarjeta (16 dígitos)</label>
                        <input
                          id="cc-number"
                          type="text"
                          placeholder="1234 1234 1234 1234"
                          value={card.number}
                          onChange={onChangeCard("number")}
                          inputMode="numeric"
                          maxLength={19}
                          required
                        />
                      </div>

                      <div className="ck-row">
                        <div className="ck-field">
                          <label htmlFor="cc-exp">Vencimiento (MM/AA)</label>
                          <input
                            id="cc-exp"
                            type="text"
                            placeholder="MM/AA"
                            value={card.exp}
                            onChange={onChangeCard("exp")}
                            inputMode="numeric"
                            maxLength={5}
                            required
                          />
                        </div>
                        <div className="ck-field">
                          <label htmlFor="cc-cvc">CVC (3 dígitos)</label>
                          <input
                            id="cc-cvc"
                            type="text"
                            placeholder="123"
                            value={card.cvc}
                            onChange={onChangeCard("cvc")}
                            inputMode="numeric"
                            maxLength={3}
                            required
                          />
                        </div>
                      </div>

                      <p className="muted xs">
                        (Demo académico) Validamos formato, no procesamos pagos reales.
                      </p>
                    </div>
                  )}
                </div>

                {/* TRANSFERENCIA */}
                <div className={`pay-item ${method === "transfer" ? "open" : ""}`}>
                  <label className="pay-head">
                    <input
                      type="radio"
                      name="payment"
                      value="transfer"
                      checked={method === "transfer"}
                      onChange={() => setMethod("transfer")}
                    />
                    <span>Transferencia bancaria</span>
                    <span className="pay-icons" aria-hidden>🏦</span>
                  </label>

                  {method === "transfer" && (
                    <div className="pay-body">
                      <div className="bank-box">
                        <div>Banco: BROU</div>
                        <div>Cuenta: 00123456789</div>
                        <div>Titular: La Otra Tribuna</div>
                        <div>Referencia: tu email ({email})</div>
                      </div>

                      {/* ===== Uploader (comprobante) ===== */}
                      <div className="uploader">
                        <label className="u-label">
                          Comprobante de transferencia <span className="req">*</span>
                        </label>

                        <label className={`u-drop ${transferNeedsProof ? "u-error" : ""}`}>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleProofChange}
                          />
                          <div className="u-cta">
                            <div className="u-icon">📎</div>
                            <div>
                              <strong>Arrastrá y soltá</strong> o <u>elegí un archivo</u><br />
                              <span className="muted xs">JPG, PNG o PDF — máx. 10 MB</span>
                            </div>
                          </div>
                        </label>

                        {(transferFile || uploadedProof) && (
                          <div className="u-file">
                            <div className="u-thumb">
                              {transferPreview ? (
                                <img src={transferPreview} alt="Comprobante" />
                              ) : (
                                <div className="u-generic">PDF</div>
                              )}
                            </div>
                            <div className="u-meta">
                              <div className="u-name">
                                {uploadedProof?.name || transferFile?.name}
                              </div>

                              {uploadingProof ? (
                                <div className="u-progress">Subiendo… {uploadProgress}%</div>
                              ) : uploadedProof ? (
                                <div className="u-ok">Comprobante cargado ✔</div>
                              ) : (
                                <div className="muted xs">Listo para subir al confirmar</div>
                              )}
                            </div>

                            {/* botón eliminar */}
                            <button
                              type="button"
                              className="u-remove"
                              onClick={removeProof}
                              title="Eliminar comprobante"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {transferNeedsProof && (
                          <div className="u-help-error">
                            Debés adjuntar el comprobante para finalizar el pedido.
                          </div>
                        )}
                      </div>

                      <p className="muted xs" style={{ marginTop: 8 }}>
                        Confirmaremos tu pago dentro de 24 h hábiles.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Columna derecha - Resumen */}
          <aside className="ck-aside">
            <div className="ck-card">
              <h2 className="ck-h3">Resumen</h2>

              <div style={{
                padding: "0.5rem 0.75rem",
                background: "#f0f9ff",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                color: "#0369a1",
                fontWeight: 600
              }}>
                💱 Pagando en {paymentCurrency === 'USD' ? 'Dólares (U$D)' : 'Pesos (UYU)'}
              </div>

              {blockedByUnavailable && (
                <div role="alert" style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12
                }}>
                  <strong style={{ display: "block", marginBottom: 6 }}>No podés comprar todavía</strong>
                  <div style={{ fontSize: "0.9rem" }}>
                    Quitá o actualizá los siguientes ítems para continuar:
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {unavailable.map(u => (
                        <li key={u.id}>
                          {u.titulo} — {u.motivo}{" "}
                          <button
                            type="button"
                            onClick={() => removeItem(u.id)}
                            title="Quitar del carrito"
                            aria-label={`Quitar ${u.titulo}`}
                            style={{
                              marginLeft: 6,
                              border: "1px solid #e5e7eb",
                              background: "#fff",
                              borderRadius: 6,
                              padding: "0 6px",
                              cursor: "pointer"
                            }}
                          >Quitar</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <ul className="mini-cart">
                {items.map((it) => {
                  const precioOriginal = Number(it.precio) || 0;
                  const precioConvertido = convertPrice(precioOriginal, it.moneda);
                  const mostrarConversion = it.moneda !== paymentCurrency;

                  return (
                    <li key={it.id} className="mini-item">
                      <img src={it.img} alt={it.nombre} />
                      <div className="mi-info">
                        <div className="mi-name" title={it.nombre}>
                          {it.nombre}
                        </div>
                        <div className="mi-sub">
                          x{it.qty} · {it.categoria}
                        </div>
                        {mostrarConversion && (
                          <div style={{
                            fontSize: "0.7rem",
                            color: "#6b7280",
                            marginTop: "0.2rem"
                          }}>
                            {money(precioOriginal, it.moneda)} → {money(precioConvertido, paymentCurrency)}
                          </div>
                        )}
                      </div>
                      <div className="mi-right">
                        <div className="mi-price">
                          {money(precioConvertido * it.qty, paymentCurrency)}
                        </div>
                        <button
                          type="button"
                          className="mi-remove"
                          aria-label={`Quitar ${it.nombre} del carrito`}
                          title="Quitar"
                          onClick={() => removeItem(it.id)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: "#fff",
                            lineHeight: 1,
                            fontSize: 18,
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "#6b7280",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "#fee2e2";
                            e.currentTarget.style.borderColor = "#fecaca";
                            e.currentTarget.style.color = "#b91c1c";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "#fff";
                            e.currentTarget.style.borderColor = "#e5e7eb";
                            e.currentTarget.style.color = "#6b7280";
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="ck-totals">
                <div>
                  <span>Total</span>
                  <strong>{money(totalFinal, paymentCurrency)}</strong>
                </div>
              </div>

              {/* Checkbox de términos */}
              <label className="ck-terms">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  <strong>Entiendo que una vez confirmado el pedido no se puede cancelar.</strong> Los productos serán procesados inmediatamente.
                </span>
              </label>

              <button
                type="submit"
                className="ck-submit"
                disabled={
                  loading ||
                  !acceptedTerms ||
                  blockedByUnavailable ||
                  items.length === 0 ||
                  (method === "transfer" && !transferFile && !uploadedProof) ||
                  uploadingProof
                }
                style={{
                  opacity:
                    (!acceptedTerms ||
                      blockedByUnavailable ||
                      items.length === 0 ||
                      (method === "transfer" && !transferFile && !uploadedProof) ||
                      uploadingProof) ? 0.5 : 1,
                  cursor:
                    (!acceptedTerms ||
                      blockedByUnavailable ||
                      items.length === 0 ||
                      (method === "transfer" && !transferFile && !uploadedProof) ||
                      uploadingProof) ? "not-allowed" : "pointer"
                }}
              >
                {loading
                  ? "Procesando…"
                  : blockedByUnavailable
                    ? "Hay ítems no disponibles"
                    : items.length === 0
                      ? "Carrito vacío"
                      : method === "transfer" && (transferNeedsProof || uploadingProof)
                        ? "Adjuntá el comprobante"
                        : "Pagar pedido"}
              </button>

              {blockedByUnavailable && (
                <p className="muted xs" style={{ marginTop: 8, color: "#991b1b" }}>
                  No podés confirmar la compra mientras haya ítems no disponibles.
                </p>
              )}

              <button
                type="button"
                className="ck-back"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Volver
              </button>
            </div>
          </aside>
        </form>
      </main>

      <CenteredModal
        open={modalOpen}
        type={modalType}
        title={modalTitle}
        onClose={() => {
          setModalOpen(false);
          if (modalType === "success") {
            navigate("/my-orders", { replace: true });
          }
        }}
        primaryAction={
          modalType === "success" ? (
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                navigate("/my-orders", { replace: true });
              }}
              style={{
                background: "#065f46",
                color: "#fff",
                padding: "8px 16px",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Ver mis pedidos
            </button>
          ) : null
        }
      >
        {modalText}
      </CenteredModal>

      {usuario?.id_usuario && (
        <AddressBookModal
          open={addressOpen}
          onClose={() => setAddressOpen(false)}
          idUsuario={usuario.id_usuario}
          addresses={addresses}
          selectedId={selected?.id_direccion || null}
          onChangeSelected={(addr) => setSelected(addr)}
          onRefresh={() => fetchAddresses(usuario.id_usuario)}
        />
      )}
    </>
  );
}
