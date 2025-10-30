// src/pages/Admin/AdminPanel.js
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./AdminPanel.css";

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingVerifications: 0,
    bannedUsers: 0,
  });

  // Verificaciones
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Usuarios
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReason, setBanReason] = useState("");

  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        await loadStats();
      } else if (activeTab === "verificaciones") {
        await loadVerifications();
      } else if (activeTab === "usuarios") {
        await loadUsers();
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [usersRes, verifiedRes, pendingRes, bannedRes] = await Promise.all([
      supabase.from("usuario").select("id_usuario", { count: "exact", head: true }),
      supabase
        .from("verificacion_identidad")
        .select("id_verificacion", { count: "exact", head: true })
        .eq("estado", "aceptado"),
      supabase
        .from("verificacion_identidad")
        .select("id_verificacion", { count: "exact", head: true })
        .eq("estado", "pendiente"),
      supabase
        .from("usuario")
        .select("id_usuario", { count: "exact", head: true })
        .eq("esta_baneado", true),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      verifiedUsers: verifiedRes.count || 0,
      pendingVerifications: pendingRes.count || 0,
      bannedUsers: bannedRes.count || 0,
    });
  }

  async function loadVerifications() {
    const { data, error } = await supabase
      .from("verificacion_identidad")
      .select(`
        id_verificacion,
        id_usuario,
        url_foto,
        estado,
        enviado_at,
        verificado_at,
        comentarios,
        usuario:id_usuario (
          id_usuario,
          nombre,
          apellido,
          email
        )
      `)
      .order("enviado_at", { ascending: false });

    if (error) {
      console.error("Error cargando verificaciones:", error);
      return;
    }
    setVerifications(data || []);
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from("usuario")
      .select("id_usuario, nombre, apellido, email, rol, esta_baneado, razon_baneo, baneado_at, fecha_alta")
      .order("fecha_alta", { ascending: false });
  
    if (error) {
      console.error("Error cargando usuarios:", error);
      return;
    }
    setUsers(data || []);
  }

  function showToast(message, type = "success") {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  }

  function showConfirm(title, message, onConfirm) {
    setConfirmModal({ show: true, title, message, onConfirm });
  }

  function closeConfirm() {
    setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
  }

  async function handleApprove(verification) {
    showConfirm(
      "Aprobar verificación",
      `¿Aprobar la verificación de ${verification.usuario?.nombre} ${verification.usuario?.apellido}?`,
      async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase
            .from("verificacion_identidad")
            .update({
              estado: "aceptado",
              verificado_at: new Date().toISOString(),
              comentarios: "Verificación aprobada",
            })
            .eq("id_verificacion", verification.id_verificacion);

          if (error) throw error;

          showToast("✅ Verificación aprobada correctamente", "success");
          setModalOpen(false);
          loadVerifications();
        } catch (err) {
          console.error(err);
          showToast("Error al aprobar: " + err.message, "error");
        } finally {
          setActionLoading(false);
        }
      }
    );
  }

  async function handleReject(verification) {
    if (!rejectReason.trim()) {
      showToast("Debes escribir un motivo de rechazo", "error");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("verificacion_identidad")
        .update({
          estado: "rechazado",
          verificado_at: new Date().toISOString(),
          comentarios: rejectReason,
        })
        .eq("id_verificacion", verification.id_verificacion);

      if (error) throw error;

      showToast("❌ Verificación rechazada", "success");
      setModalOpen(false);
      setRejectReason("");
      loadVerifications();
    } catch (err) {
      console.error(err);
      showToast("Error al rechazar: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBanUser(user) {
    if (!banReason.trim()) {
      showToast("Debes escribir un motivo de baneo", "error");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("usuario")
        .update({
          esta_baneado: true,
          razon_baneo: banReason,
          baneado_at: new Date().toISOString(),
        })
        .eq("id_usuario", user.id_usuario);

      if (error) throw error;

      showToast("🚫 Usuario baneado correctamente", "success");
      setBanModalOpen(false);
      setBanReason("");
      loadUsers();
    } catch (err) {
      console.error(err);
      showToast("Error al banear: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnbanUser(user) {
    showConfirm(
      "Desbanear usuario",
      `¿Desbanear a ${user.nombre} ${user.apellido}? Podrá volver a usar la plataforma.`,
      async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase
            .from("usuario")
            .update({
              esta_baneado: false,
              razon_baneo: null,
              baneado_at: null,
            })
            .eq("id_usuario", user.id_usuario);

          if (error) throw error;

          showToast("✅ Usuario desbaneado correctamente", "success");
          loadUsers();
        } catch (err) {
          console.error(err);
          showToast("Error al desbanear: " + err.message, "error");
        } finally {
          setActionLoading(false);
        }
      }
    );
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <header className="admin-header">
        <h1>Panel de Administración</h1>
        <div className="admin-nav">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            📊 Dashboard
          </button>
          <button
            className={activeTab === "verificaciones" ? "active" : ""}
            onClick={() => setActiveTab("verificaciones")}
          >
            🔍 Verificaciones
          </button>
          <button
            className={activeTab === "usuarios" ? "active" : ""}
            onClick={() => setActiveTab("usuarios")}
          >
            👥 Usuarios
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="admin-content">
        {loading ? (
          <div className="admin-loading">Cargando...</div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <div className="dashboard-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalUsers}</div>
                    <div className="stat-label">Usuarios totales</div>
                  </div>
                </div>
                <div className="stat-card verified">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.verifiedUsers}</div>
                    <div className="stat-label">Usuarios verificados</div>
                  </div>
                </div>
                <div className="stat-card pending">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.pendingVerifications}</div>
                    <div className="stat-label">Verificaciones pendientes</div>
                  </div>
                </div>
                <div className="stat-card banned">
                  <div className="stat-icon">🚫</div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.bannedUsers}</div>
                    <div className="stat-label">Usuarios baneados</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "verificaciones" && (
              <div className="verifications-list">
                <h2>Verificaciones de identidad</h2>
                {verifications.length === 0 ? (
                  <p className="empty-state">No hay verificaciones</p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Email</th>
                          <th>Estado</th>
                          <th>Fecha envío</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifications.map((v) => (
                          <tr key={v.id_verificacion}>
                            <td>
                              {v.usuario?.nombre} {v.usuario?.apellido}
                            </td>
                            <td>{v.usuario?.email}</td>
                            <td>
                              <span className={`badge badge-${v.estado}`}>
                                {v.estado}
                              </span>
                            </td>
                            <td>{new Date(v.enviado_at).toLocaleDateString()}</td>
                            <td>
                              <button
                                className="btn-small"
                                onClick={() => {
                                  setSelectedVerification(v);
                                  setModalOpen(true);
                                }}
                              >
                                Ver detalles
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "usuarios" && (
              <div className="users-list">
                <h2>Gestión de usuarios</h2>
                {users.length === 0 ? (
                  <p className="empty-state">No hay usuarios</p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Rol</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id_usuario}>
                            <td>
                              {u.nombre} {u.apellido}
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`badge badge-${u.rol}`}>
                                {u.rol}
                              </span>
                            </td>
                            <td>
                              {u.esta_baneado ? (
                                <span className="badge badge-rechazado">Baneado</span>
                              ) : (
                                <span className="badge badge-aceptado">Activo</span>
                              )}
                            </td>
                            <td>
                              {u.rol !== "admin" && (
                                <>
                                  {u.esta_baneado ? (
                                    <button
                                      className="btn-small btn-success"
                                      onClick={() => handleUnbanUser(u)}
                                      disabled={actionLoading}
                                    >
                                      Desbanear
                                    </button>
                                  ) : (
                                    <button
                                      className="btn-small btn-danger"
                                      onClick={() => {
                                        setSelectedUser(u);
                                        setBanModalOpen(true);
                                      }}
                                      disabled={actionLoading}
                                    >
                                      Banear
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{confirmModal.title}</h3>
              <button className="modal-close" onClick={closeConfirm}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: "1rem 0", color: "#374151" }}>{confirmModal.message}</p>
              <div className="action-buttons">
                <button className="btn-cancel" onClick={closeConfirm}>
                  Cancelar
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    confirmModal.onConfirm();
                    closeConfirm();
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de verificación */}
      {modalOpen && selectedVerification && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verificación de identidad</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="verification-info">
                <p>
                  <strong>Usuario:</strong> {selectedVerification.usuario?.nombre}{" "}
                  {selectedVerification.usuario?.apellido}
                </p>
                <p>
                  <strong>Email:</strong> {selectedVerification.usuario?.email}
                </p>
                <p>
                  <strong>Estado:</strong>{" "}
                  <span className={`badge badge-${selectedVerification.estado}`}>
                    {selectedVerification.estado}
                  </span>
                </p>
                <p>
                  <strong>Fecha de envío:</strong>{" "}
                  {new Date(selectedVerification.enviado_at).toLocaleString()}
                </p>
                {selectedVerification.comentarios && (
                  <p>
                    <strong>Comentarios:</strong> {selectedVerification.comentarios}
                  </p>
                )}
              </div>

              <div className="verification-image">
                <img
                  src={selectedVerification.url_foto}
                  alt="Documento de identidad"
                />
              </div>

              {selectedVerification.estado === "pendiente" && (
                <div className="verification-actions">
                  <div className="reject-section">
                    <textarea
                      placeholder="Motivo de rechazo (opcional si apruebas)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows="3"
                    />
                  </div>
                  <div className="action-buttons">
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(selectedVerification)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Procesando..." : "✅ Aprobar"}
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReject(selectedVerification)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Procesando..." : "❌ Rechazar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de baneo */}
      {banModalOpen && selectedUser && (
        <div className="modal-overlay" onClick={() => setBanModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Banear usuario</h3>
              <button className="modal-close" onClick={() => setBanModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                ¿Estás seguro de banear a <strong>{selectedUser.nombre} {selectedUser.apellido}</strong>?
              </p>
              <div className="ban-section">
                <label>Motivo del baneo:</label>
                <textarea
                  placeholder="Describe el motivo (requerido)"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows="4"
                />
              </div>
              <div className="action-buttons">
                <button
                  className="btn-cancel"
                  onClick={() => setBanModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleBanUser(selectedUser)}
                  disabled={actionLoading || !banReason.trim()}
                >
                  {actionLoading ? "Baneando..." : "🚫 Banear usuario"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}