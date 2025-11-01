import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { supabase } from "../../lib/supabaseClient";
import "./MisPedidos.css";
import Dropdown from "../../components/Dropdown/Dropdown";

const PLACEHOLDER = "https://placehold.co/150x150?text=Producto";

const ESTADOS_PEDIDO = {
  pendiente:  { label: "Pendiente",  color: "#f59e0b", icon: "⏳" },
  confirmado: { label: "Confirmado", color: "#3b82f6", icon: "✓"  },
  enviado:    { label: "Enviado",    color: "#8b5cf6", icon: "📦" },
  entregado:  { label: "Entregado",  color: "#10b981", icon: "✓✓" },
  cancelado:  { label: "Cancelado",  color: "#ef4444", icon: "✗"  },
};

// ✅ Formateo moneda (U$D para USD)
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

export default function MisPedidos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const estadoOptions = useMemo(
    () => [
      { value: "todos", label: "Todos" },
      ...Object.entries(ESTADOS_PEDIDO).map(([value, { label }]) => ({
        value, label,
      })),
    ],
    []
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/login"); return; }

        const { data: userData, error: userError } = await supabase
          .from("usuario").select("id_usuario,id_auth")
          .eq("id_auth", user.id).maybeSingle();
        if (userError) throw userError;
        if (!userData?.id_usuario) { setError("Usuario no encontrado."); return; }

        const idUsuario = userData.id_usuario;

        const { data: pedidosData, error: pedidosError } = await supabase
          .from("pedido").select(`
            id_pedido, fecha_pedido, estado, total, cantidad,
            id_publicacion, codigo_seguimiento
          `)
          .eq("id_usuario", idUsuario)
          .order("fecha_pedido", { ascending: false });
        if (pedidosError) throw pedidosError;

        const mapped = await Promise.all(
          (pedidosData || []).map(async (pedido) => {
            const { data: pub } = await supabase
              .from("publicacion")
              .select(`
                id_publicacion, titulo, precio, club, categoria,
                id_usuario, moneda, foto ( url, orden_foto )
              `)
              .eq("id_publicacion", pedido.id_publicacion)
              .maybeSingle();

            let vendedor = null;
            if (pub?.id_usuario) {
              const { data: vendData } = await supabase
                .from("usuario")
                .select("nombre, apellido, email")
                .eq("id_usuario", pub.id_usuario)
                .maybeSingle();
              vendedor = vendData || null;
            }

            const primeraFoto =
              Array.isArray(pub?.foto) && pub.foto.length
                ? pub.foto[0].url
                : PLACEHOLDER;

            return {
              id_pedido: pedido.id_pedido,
              codigo: pedido.codigo_seguimiento || "s/ código",
              fecha: pedido.fecha_pedido
                ? new Date(pedido.fecha_pedido).toLocaleDateString("es-UY")
                : "-",
              estado: pedido.estado || "pendiente",
              total: Number(pedido.total) || 0,
              cantidad: pedido.cantidad || 1,
              moneda: pub?.moneda || "UYU",
              producto: {
                id: pub?.id_publicacion || pedido.id_publicacion,
                titulo: pub?.titulo || "Sin título",
                precio: Number(pub?.precio) || 0,
                club: pub?.club || "",
                categoria: pub?.categoria || "Club",
                img: primeraFoto,
                moneda: pub?.moneda || "UYU",
              },
              vendedor: {
                nombre:
                  `${vendedor?.nombre || ""} ${vendedor?.apellido || ""}`.trim() || "Vendedor",
                email: vendedor?.email || "",
              },
            };
          })
        );

        if (alive) setPedidos(mapped);
      } catch (err) {
        if (alive) setError(err.message || "Error al cargar los pedidos");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [navigate]);

  const pedidosFiltrados =
    filtroEstado === "todos" ? pedidos : pedidos.filter((p) => p.estado === filtroEstado);

  // ✅ Estadísticas separadas por moneda
  const estadisticas = pedidos.reduce(
    (acc, p) => {
      if (p.moneda === "USD") acc.totalUSD += p.total;
      else acc.totalUYU += p.total;
      acc.cantidad += p.cantidad;
      if (p.estado === "entregado") acc.entregados++;
      if (p.estado === "enviado") acc.enTransito++;
      if (p.estado === "pendiente" || p.estado === "confirmado") acc.enProceso++;
      return acc;
    },
    { totalUYU: 0, totalUSD: 0, cantidad: 0, entregados: 0, enTransito: 0, enProceso: 0 }
  );

  return (
    <>
      <Header />
      <main className="container mis-pedidos-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
          <h1>Mis Pedidos</h1>
        </div>

        {loading ? (
          <div className="loading-state">Cargando pedidos...</div>
        ) : error ? (
          <div className="error-state" role="alert">{error}</div>
        ) : pedidos.length === 0 ? (
          <div className="empty-state">
            <p>Aún no has realizado ningún pedido.</p>
            <button onClick={() => navigate("/")}>Explorar productos</button>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              {/* Total UYU + hint */}
              <div className="stat-card">
                <span className="stat-label">Total Gastado (UYU)</span>
                <span className="stat-value">{money(estadisticas.totalUYU, "UYU")}</span>
                <span
                  className="kpi-hint"
                  data-tip="Este total incluye únicamente compras pagadas en UYU. No se convierte a USD ni se suma con el total en USD."
                >*</span>
              </div>

              {/* Total USD + hint (solo si hay USD) */}
              {estadisticas.totalUSD > 0 && (
                <div className="stat-card stat-card-usd">
                  <span className="stat-label">Total Gastado (USD)</span>
                  <span className="stat-value">{money(estadisticas.totalUSD, "USD")}</span>
                  <span
                    className="kpi-hint"
                    data-tip="Este total incluye únicamente compras pagadas en USD. No se convierte a UYU ni se suma con el total en UYU."
                  >*</span>
                </div>
              )}

              <div className="stat-card">
                <span className="stat-label">Productos Comprados</span>
                <span className="stat-value">{estadisticas.cantidad}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Entregados</span>
                <span className="stat-value">{estadisticas.entregados}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">En Tránsito</span>
                <span className="stat-value">{estadisticas.enTransito}</span>
              </div>
            </div>

            <div className="mp-filters-toolbar">
              <div className="mp-ft-left">
                <Dropdown
                  icon="↕︎"
                  value={filtroEstado}
                  onChange={setFiltroEstado}
                  options={estadoOptions}
                />
              </div>
            </div>

            <div className="pedidos-list">
              {pedidosFiltrados.length === 0 ? (
                <div className="empty-state">
                  No hay pedidos con el estado "{ESTADOS_PEDIDO[filtroEstado]?.label || filtroEstado}"
                </div>
              ) : (
                pedidosFiltrados.map((pedido) => (
                  <div key={pedido.id_pedido} className="pedido-card">
                    <div className="pedido-header">
                      <div>
                        <span className="pedido-numero">Pedido #{pedido.codigo}</span>
                        <span className="pedido-fecha">{pedido.fecha}</span>
                      </div>
                      <span
                        className="pedido-estado"
                        style={{ backgroundColor: ESTADOS_PEDIDO[pedido.estado]?.color || "#9ca3af" }}
                      >
                        {ESTADOS_PEDIDO[pedido.estado]?.icon}{" "}
                        {ESTADOS_PEDIDO[pedido.estado]?.label || pedido.estado}
                      </span>
                    </div>

                    <div className="pedido-content">
                      <img
                        src={pedido.producto.img}
                        alt={pedido.producto.titulo}
                        className="pedido-img"
                        onClick={() => navigate(`/publication/${pedido.producto.id}`)}
                      />
                      <div className="pedido-info">
                        <h3
                          className="pedido-titulo"
                          onClick={() => navigate(`/publication/${pedido.producto.id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          {pedido.producto.titulo}
                        </h3>
                        <p className="pedido-club">{pedido.producto.club}</p>
                        <div className="pedido-detalles">
                          <span>Cantidad: {pedido.cantidad}</span>
                          <span>Precio unitario: {money(pedido.producto.precio, pedido.producto.moneda)}</span>
                        </div>
                      </div>

                      <div className="pedido-vendedor">
                        <h4>Vendedor</h4>
                        <p className="vendedor-nombre">{pedido.vendedor.nombre}</p>
                        <p className="vendedor-email">{pedido.vendedor.email}</p>
                      </div>

                      <div className="pedido-total">
                        <span className="total-label">Total</span>
                        <span className="total-value">{money(pedido.total, pedido.moneda)}</span>
                      </div>
                    </div>

                    {pedido.estado === "entregado" && (
                      <div className="pedido-actions">
                        <button
                          onClick={() => navigate(`/publication/${pedido.producto.id}`)}
                          className="btn-comprar-nuevo"
                        >
                          Comprar de nuevo
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
