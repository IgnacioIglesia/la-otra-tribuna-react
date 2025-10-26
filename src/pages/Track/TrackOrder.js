// src/pages/TrackOrder/TrackOrder.js
import React, { useState } from "react";
import "./TrackOrder.css";
import HeaderSimplif from "../../components/HeaderSimplif/HeaderSimplif";
import { supabase } from "../../lib/supabaseClient";

export default function TrackOrder() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const ESTADOS = {
    pendiente: {
      color: "#f59e0b",
      icon: "⏳",
      mensaje: "Tu pedido está siendo procesado",
    },
    confirmado: {
      color: "#3b82f6",
      icon: "✓",
      mensaje: "Tu pedido ha sido confirmado",
    },
    enviado: {
      color: "#8b5cf6",
      icon: "📦",
      mensaje: "Tu pedido está en camino",
    },
    entregado: {
      color: "#10b981",
      icon: "✓✓",
      mensaje: "Tu pedido ha sido entregado",
    },
    cancelado: {
      color: "#ef4444",
      icon: "✕",
      mensaje: "Este pedido fue cancelado",
    },
  };

  const getEstadoInfo = (estado) => ESTADOS[estado] || ESTADOS.pendiente;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-UY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMoney = (amount) =>
    new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "UYU",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Por favor ingresá un código de seguimiento");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      // 1) Buscar el pedido por codigo_seguimiento
      const { data: ped, error: qErr } = await supabase
        .from("pedido")
        .select(
          `
          id_pedido,
          codigo_seguimiento,
          fecha_pedido,
          estado,
          total,
          cantidad,
          id_publicacion
        `
        )
        .eq("codigo_seguimiento", code.trim().toUpperCase())
        .maybeSingle();

      if (qErr) throw qErr;

      if (!ped) {
        setError(
          "No se encontró ningún pedido con ese código de seguimiento"
        );
        return;
      }

      // 2) Traer datos de la publicación relacionada (título, foto)
      let pub = null;
      if (ped.id_publicacion) {
        const { data: pubData } = await supabase
          .from("publicacion")
          .select(
            `
            id_publicacion,
            titulo,
            precio,
            club,
            categoria,
            foto ( url, orden_foto )
          `
          )
          .eq("id_publicacion", ped.id_publicacion)
          .maybeSingle();
        pub = pubData || null;
      }

      // 3) Armar objeto de presentación (defensivo)
      const primeraFoto =
        (Array.isArray(pub?.foto) &&
          pub.foto.sort((a, b) => (a.orden_foto ?? 999) - (b.orden_foto ?? 999))[0]
            ?.url) ||
        "/assets/placeholder-product.png";

      const result = {
        id_pedido: ped.id_pedido,
        codigo_seguimiento: ped.codigo_seguimiento,
        fecha_pedido: ped.fecha_pedido,
        estado: ped.estado || "pendiente",
        total: ped.total,
        cantidad: ped.cantidad || 1,
        publicacion: {
          id: pub?.id_publicacion || ped.id_publicacion,
          titulo: pub?.titulo || "Producto",
          precio: pub?.precio ?? null,
          club: pub?.club || "",
          categoria: pub?.categoria || "Club",
          img: primeraFoto,
        },
        // Campos de envío opcionales (no están en tu esquema actual):
        fecha_envio: null,
        fecha_entrega: null,
        direccion_envio: null,
        ciudad_envio: null,
        departamento_envio: null,
        codigo_postal_envio: null,
        // Detalle (no está en tu esquema actual como relación):
        detalle: [
          {
            titulo: pub?.titulo || "Producto",
            cantidad: ped.cantidad || 1,
            precio_unitario: pub?.precio ?? 0,
            img: primeraFoto,
          },
        ],
      };

      setOrder(result);
    } catch (err) {
      console.error("Error al rastrear pedido:", err);
      setError("Ocurrió un error al buscar el pedido. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <HeaderSimplif />

      <section
        className="track-wrap"
        style={{
          backgroundImage: "url(/assets/pedido.png)",
          backgroundPosition: "center 50%",
          backgroundSize: "1640px auto",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#f6f7f9",
        }}
      >
        <div className="bg-overlay" />

        <div className="track-container">
          {/* Tarjeta de búsqueda */}
          <form className="track-card" onSubmit={onSubmit} noValidate>
            <div className="card-head">
              <img
                src="/assets/imagen.png"
                alt="La Otra Tribuna"
                className="brand"
              />
              <h2>Rastrear Pedido</h2>
            </div>

            <div className="field">
              <label htmlFor="track">Número de seguimiento</label>
              <input
                id="track"
                type="text"
                placeholder="Ej: ABC123456"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Rastrear"}
            </button>

            <p className="hint">
              Ingresá el código que se encuentra en la sección de tus pedidos.
            </p>
          </form>

          {/* Resultado del pedido */}
          {order && (
            <div className="order-result">
              <div className="order-header">
                <div
                  className="order-status"
                  style={{ backgroundColor: getEstadoInfo(order.estado).color }}
                >
                  <span className="status-icon">
                    {getEstadoInfo(order.estado).icon}
                  </span>
                  <div className="status-info">
                    <h3 style={{ textTransform: "capitalize" }}>
                      {order.estado}
                    </h3>
                    <p>{getEstadoInfo(order.estado).mensaje}</p>
                  </div>
                </div>

                <div className="order-meta">
                  <div className="meta-item">
                    <span className="meta-label">Código de seguimiento:</span>
                    <span className="meta-value">
                      {order.codigo_seguimiento}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Fecha de pedido:</span>
                    <span className="meta-value">
                      {formatDate(order.fecha_pedido)}
                    </span>
                  </div>
                  {order.fecha_envio && (
                    <div className="meta-item">
                      <span className="meta-label">Fecha de envío:</span>
                      <span className="meta-value">
                        {formatDate(order.fecha_envio)}
                      </span>
                    </div>
                  )}
                  {order.fecha_entrega && (
                    <div className="meta-item">
                      <span className="meta-label">Fecha de entrega:</span>
                      <span className="meta-value">
                        {formatDate(order.fecha_entrega)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline de estado */}
              <div className="order-timeline">
                <div
                  className={`timeline-step ${
                    ["pendiente", "confirmado", "enviado", "entregado"].includes(
                      order.estado
                    )
                      ? "completed"
                      : ""
                  }`}
                >
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>Pedido realizado</h4>
                    <p>{formatDate(order.fecha_pedido)}</p>
                  </div>
                </div>

                <div
                  className={`timeline-step ${
                    ["confirmado", "enviado", "entregado"].includes(order.estado)
                      ? "completed"
                      : ""
                  }`}
                >
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>Confirmado</h4>
                    <p>
                      {["confirmado", "enviado", "entregado"].includes(
                        order.estado
                      )
                        ? "Confirmado"
                        : "Pendiente"}
                    </p>
                  </div>
                </div>

                <div
                  className={`timeline-step ${
                    ["enviado", "entregado"].includes(order.estado)
                      ? "completed"
                      : ""
                  }`}
                >
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>En camino</h4>
                    <p>
                      {order.fecha_envio
                        ? formatDate(order.fecha_envio)
                        : "Pendiente"}
                    </p>
                  </div>
                </div>

                <div
                  className={`timeline-step ${
                    order.estado === "entregado" ? "completed" : ""
                  }`}
                >
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>Entregado</h4>
                    <p>
                      {order.fecha_entrega
                        ? formatDate(order.fecha_entrega)
                        : "Pendiente"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dirección de envío (no existe en tu esquema actual, queda oculta si null) */}
              {order.direccion_envio && (
                <div className="shipping-info">
                  <h3>Dirección de envío</h3>
                  <p>{order.direccion_envio}</p>
                  <p>
                    {order.ciudad_envio}, {order.departamento_envio}
                  </p>
                  {order.codigo_postal_envio && (
                    <p>CP: {order.codigo_postal_envio}</p>
                  )}
                </div>
              )}

              {/* Productos del pedido (usamos 1 línea con la publicación) */}
              <div className="order-items">
                <h3>Productos</h3>
                {order.detalle?.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <img src={item.img} alt={item.titulo} />
                    <div className="item-info">
                      <h4>{item.titulo}</h4>
                      <p className="item-quantity">Cantidad: {item.cantidad}</p>
                      {item.precio_unitario != null && (
                        <p className="item-price">
                          {formatMoney(item.precio_unitario)} c/u
                        </p>
                      )}
                    </div>
                    <div className="item-total">
                      {formatMoney(
                        (item.precio_unitario ?? 0) * (item.cantidad ?? 1)
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total del pedido */}
              <div className="order-total">
                <span>Total del pedido:</span>
                <span className="total-amount">
                  {formatMoney(order.total)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}