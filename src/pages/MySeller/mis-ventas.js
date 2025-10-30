// src/pages/MisVentas/MisVentas.js
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { supabase } from "../../lib/supabaseClient";
import "./MisVentas.css";
import Dropdown from "../../components/Dropdown/Dropdown";

const PLACEHOLDER = "https://placehold.co/150x150?text=Producto";

const ESTADOS_PEDIDO = {
  pendiente:  { label: "Pendiente",  color: "#f59e0b" },
  confirmado: { label: "Confirmado", color: "#3b82f6" },
  enviado:    { label: "Enviado",    color: "#8b5cf6" },
  entregado:  { label: "Entregado",  color: "#10b981" },
  cancelado:  { label: "Cancelado",  color: "#ef4444" },
};

// ✅ Formateo de moneda igual que en MisPedidos (U$D para USD)
function money(n, currency = "UYU") {
  const amount = Number(n) || 0;

  if (currency === "USD") {
    const formatted = new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
    return formatted.replace("US$", "U$D");
  }

  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MisVentas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  const estadoOptions = useMemo(
    () =>
      Object.entries(ESTADOS_PEDIDO).map(([value, { label }]) => ({
        value,
        label,
      })),
    []
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        // Buscar id_usuario en tabla usuario
        const { data: userData, error: userError } = await supabase
          .from("usuario")
          .select("id_usuario")
          .eq("id_auth", user.id)
          .maybeSingle();

        if (userError) throw userError;
        if (!userData) {
          setError("Usuario no encontrado");
          return;
        }

        const idUsuario = userData.id_usuario;
        setUserId(idUsuario);

        // Traer TODOS los pedidos
        const { data: pedidos, error: pedidosError } = await supabase
          .from("pedido")
          .select(`
            id_pedido,
            fecha_pedido,
            estado,
            total,
            cantidad,
            id_publicacion,
            id_usuario
          `)
          .order("fecha_pedido", { ascending: false });

        if (pedidosError) throw pedidosError;

        // IDs de mis publicaciones
        const { data: misPublicaciones, error: pubError } = await supabase
          .from("publicacion")
          .select("id_publicacion")
          .eq("id_usuario", idUsuario);

        if (pubError) throw pubError;

        const misPublicacionesIds = (misPublicaciones || []).map(p => p.id_publicacion);

        // Quedarme solo con pedidos de mis publicaciones (mis ventas)
        const pedidosFiltrados = (pedidos || []).filter(p =>
          misPublicacionesIds.includes(p.id_publicacion)
        );

        // Enriquecer cada venta con datos de publicación (incluye MONEDA) y comprador
        const mapped = await Promise.all(
          pedidosFiltrados.map(async (pedido) => {
            // Publicación (incluye moneda)
            const { data: pub } = await supabase
              .from("publicacion")
              .select(`
                id_publicacion,
                titulo,
                precio,
                club,
                categoria,
                moneda,
                foto ( url, orden_foto )
              `)
              .eq("id_publicacion", pedido.id_publicacion)
              .maybeSingle();

            // Comprador
            const { data: comprador } = await supabase
              .from("usuario")
              .select("nombre, apellido, email")
              .eq("id_usuario", pedido.id_usuario)
              .maybeSingle();

            const primeraFoto = pub?.foto?.[0]?.url || PLACEHOLDER;
            const moneda = pub?.moneda || "UYU";

            return {
              id_pedido: pedido.id_pedido,
              fecha: pedido.fecha_pedido
                ? new Date(pedido.fecha_pedido).toLocaleDateString("es-UY")
                : "-",
              estado: pedido.estado || "pendiente",
              total: Number(pedido.total) || 0,
              cantidad: pedido.cantidad || 1,
              moneda, // ✅ moneda de la venta (desde la publicación)
              producto: {
                id: pub?.id_publicacion,
                titulo: pub?.titulo || "Sin título",
                precio: Number(pub?.precio) || 0,
                club: pub?.club || "",
                categoria: pub?.categoria || "Club",
                img: primeraFoto,
                moneda, // ✅ moneda del producto
              },
              comprador: {
                nombre:
                  `${comprador?.nombre || ""} ${comprador?.apellido || ""}`.trim() ||
                  "Usuario",
                email: comprador?.email || "",
              },
            };
          })
        );

        if (alive) setVentas(mapped);
      } catch (err) {
        if (alive) setError(err.message || "Error al cargar las ventas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [navigate]);

  // Cambiar estado del pedido
  const handleEstadoChange = async (idPedido, nuevoEstado) => {
    try {
      const { error } = await supabase
        .from("pedido")
        .update({ estado: nuevoEstado })
        .eq("id_pedido", idPedido);

      if (error) throw error;

      setVentas((prev) =>
        prev.map((v) =>
          v.id_pedido === idPedido ? { ...v, estado: nuevoEstado } : v
        )
      );
    } catch (err) {
      alert("Error al actualizar el estado: " + err.message);
    }
  };

  // ✅ Estadísticas separadas por moneda (igual enfoque que MisPedidos)
  const estadisticas = ventas.reduce(
    (acc, v) => {
      if (v.moneda === "USD") acc.totalUSD += v.total;
      else acc.totalUYU += v.total;

      acc.cantidad += v.cantidad;
      if (v.estado === "entregado") acc.completadas++;
      if (v.estado === "pendiente") acc.pendientes++;
      return acc;
    },
    { totalUYU: 0, totalUSD: 0, cantidad: 0, completadas: 0, pendientes: 0 }
  );

  return (
    <>
      <Header />
      <main className="container mis-ventas-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Volver
          </button>
          <h1>Mis Ventas</h1>
        </div>

        {loading ? (
          <div className="loading-state">Cargando ventas...</div>
        ) : error ? (
          <div className="error-state" role="alert">
            {error}
          </div>
        ) : ventas.length === 0 ? (
          <div className="empty-state">
            <p>Aún no tienes ventas.</p>
            <button onClick={() => navigate("/my-listings")}>
              Ver mis publicaciones
            </button>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              {/* Total UYU */}
              <div className="stat-card">
                <span className="stat-label">Total Vendido (UYU)</span>
                <span className="stat-value">{money(estadisticas.totalUYU, "UYU")}</span>
              </div>

              {/* Total USD (solo si hay ventas en USD) */}
              {estadisticas.totalUSD > 0 && (
                <div className="stat-card stat-card-usd">
                  <span className="stat-label">Total Vendido (USD)</span>
                  <span className="stat-value">{money(estadisticas.totalUSD, "USD")}</span>
                </div>
              )}

              <div className="stat-card">
                <span className="stat-label">Productos Vendidos</span>
                <span className="stat-value">{estadisticas.cantidad}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Completadas</span>
                <span className="stat-value">{estadisticas.completadas}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Pendientes</span>
                <span className="stat-value">{estadisticas.pendientes}</span>
              </div>
            </div>

            <div className="ventas-list">
              {ventas.map((venta) => (
                <div key={venta.id_pedido} className="venta-card">
                  <div className="venta-header">
                    <span className="venta-fecha">
                      Pedido #{venta.id_pedido} - {venta.fecha}
                    </span>
                    <span
                      className="venta-estado"
                      style={{ backgroundColor: ESTADOS_PEDIDO[venta.estado]?.color }}
                    >
                      {ESTADOS_PEDIDO[venta.estado]?.label || venta.estado}
                    </span>
                  </div>

                  <div className="venta-content">
                    <img
                      src={venta.producto.img}
                      alt={venta.producto.titulo}
                      className="venta-img"
                      onClick={() => navigate(`/producto/${venta.producto.id}`)}
                    />
                    <div className="venta-info">
                      <h3 className="venta-titulo">{venta.producto.titulo}</h3>
                      <p className="venta-club">{venta.producto.club}</p>
                      <div className="venta-detalles">
                        <span>Cantidad: {venta.cantidad}</span>
                        <span>
                          Precio unitario: {money(venta.producto.precio, venta.producto.moneda)}
                        </span>
                      </div>
                    </div>
                    <div className="venta-comprador">
                      <h4>Comprador</h4>
                      <p className="comprador-nombre">{venta.comprador.nombre}</p>
                      <p className="comprador-email">{venta.comprador.email}</p>
                    </div>
                    <div className="venta-total">
                      <span className="total-label">Total</span>
                      <span className="total-value">{money(venta.total, venta.moneda)}</span>
                    </div>
                  </div>

                  <div className="venta-actions">
                    <Dropdown
                      icon="↕︎"
                      value={venta.estado}
                      options={estadoOptions}
                      onChange={(val) => handleEstadoChange(venta.id_pedido, val)}
                      align="right"
                      className="venta-dd"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}