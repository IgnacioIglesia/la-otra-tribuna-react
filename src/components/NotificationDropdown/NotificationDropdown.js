// src/components/NotificationDropdown/NotificationDropdown.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../Favorites/FavoritesContext";
import { useCart } from "../Cart/CartContext";
import { supabase } from "../../lib/supabaseClient";
import "./NotificationDropdown.css";

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  
  const { favorites } = useFavorites();
  const { items: cartItems } = useCart();

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ CARGAR NOTIFICACIONES Y SUSCRIBIRSE A CAMBIOS EN TIEMPO REAL
  useEffect(() => {
    let subscription = null;
    let idUsuario = null;

    const cargarNotificacionesDB = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.email) return;

        const { data: usuario } = await supabase
          .from("usuario")
          .select("id_usuario")
          .eq("email", session.session.user.email)
          .single();

        if (!usuario) return;
        
        idUsuario = usuario.id_usuario;

        // Cargar notificaciones existentes
        const { data: notifs, error } = await supabase
          .from("notificacion")
          .select("*")
          .eq("id_usuario", usuario.id_usuario)
          .order("fecha_creacion", { ascending: false })
          .limit(50);

        if (error) throw error;

        if (notifs && notifs.length > 0) {
          const notificacionesFormateadas = notifs.map(n => ({
            id: n.id_notificacion,
            tipo: n.tipo,
            titulo: n.titulo,
            mensaje: n.mensaje,
            fecha: n.fecha_creacion,
            leida: n.leida,
            id_pedido: n.id_pedido,
            id_publicacion: n.id_publicacion
          }));

          setNotifications(notificacionesFormateadas);
          localStorage.setItem("notifications", JSON.stringify(notificacionesFormateadas));
        }

        // ✅ SUSCRIBIRSE A NUEVAS NOTIFICACIONES EN TIEMPO REAL
        subscription = supabase
          .channel('notificaciones_realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notificacion',
              filter: `id_usuario=eq.${usuario.id_usuario}`
            },
            (payload) => {
              console.log('Nueva notificación recibida:', payload.new);
              
              const nuevaNotif = {
                id: payload.new.id_notificacion,
                tipo: payload.new.tipo,
                titulo: payload.new.titulo,
                mensaje: payload.new.mensaje,
                fecha: payload.new.fecha_creacion,
                leida: payload.new.leida,
                id_pedido: payload.new.id_pedido,
                id_publicacion: payload.new.id_publicacion
              };

              setNotifications(prev => {
                const updated = [nuevaNotif, ...prev];
                localStorage.setItem("notifications", JSON.stringify(updated));
                return updated;
              });

              // Mostrar notificación del navegador (opcional)
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(nuevaNotif.titulo, {
                  body: nuevaNotif.mensaje,
                  icon: '/favicon.ico'
                });
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error("Error al cargar notificaciones:", error);
      }
    };

    cargarNotificacionesDB();

    // Limpiar suscripción al desmontar
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  // Limpiar notificaciones antiguas de localStorage al iniciar
  useEffect(() => {
    const storedNotifs = JSON.parse(localStorage.getItem("notifications") || "[]");
    
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const cleanedNotifs = storedNotifs.filter(n => new Date(n.fecha).getTime() > sevenDaysAgo);
    
    if (cleanedNotifs.length !== storedNotifs.length) {
      localStorage.setItem("notifications", JSON.stringify(cleanedNotifs));
    }
  }, []);

  // Escuchar eventos personalizados para nuevas notificaciones
  useEffect(() => {
    const handleNewNotification = (event) => {
      const newNotif = {
        id: Date.now() + Math.random(),
        tipo: event.detail.tipo,
        titulo: event.detail.titulo,
        mensaje: event.detail.mensaje,
        fecha: new Date().toISOString(),
        leida: false,
        ...event.detail
      };

      setNotifications(prev => {
        const updated = [newNotif, ...prev];
        localStorage.setItem("notifications", JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener("new-notification", handleNewNotification);
    return () => window.removeEventListener("new-notification", handleNewNotification);
  }, []);

  const unreadCount = notifications.filter(n => !n.leida).length;

  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, leida: true } : n);
      localStorage.setItem("notifications", JSON.stringify(updated));
      return updated;
    });

    // Marcar como leída en DB si es una notificación de DB
    if (typeof id === 'number' && id < Date.now()) {
      supabase
        .from("notificacion")
        .update({ leida: true })
        .eq("id_notificacion", id)
        .then(({ error }) => {
          if (error) console.error("Error al marcar como leída:", error);
        });
    }
  };

  const deleteNotification = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem("notifications", JSON.stringify(updated));
      return updated;
    });

    if (typeof id === 'number' && id < Date.now()) {
      supabase
        .from("notificacion")
        .delete()
        .eq("id_notificacion", id)
        .then(({ error }) => {
          if (error) console.error("Error al eliminar notificación:", error);
        });
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.leida) {
      markAsRead(notif.id);
    }

    setIsOpen(false);

    switch (notif.tipo) {
      case "venta":
        navigate("/my-sales");
        break;
      case "compra":
        navigate("/my-orders");
        break;
      case "publicacion":
        if (notif.id_publicacion) {
          navigate(`/publication/${notif.id_publicacion}`);
        } else {
          navigate("/my-publications");
        }
        break;
      case "carrito":
        if (notif.id_publicacion) {
          navigate(`/publication/${notif.id_publicacion}`);
        } else {
          window.dispatchEvent(new CustomEvent("open-cart"));
        }
        break;
      case "favorito":
        if (notif.id_publicacion) {
          navigate(`/publication/${notif.id_publicacion}`);
        } else {
          navigate("/favorites");
        }
        break;
      default:
        break;
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, leida: true }));
      localStorage.setItem("notifications", JSON.stringify(updated));
      return updated;
    });

    supabase.auth.getSession().then(({ data: session }) => {
      if (!session?.session?.user?.email) return;
      
      supabase
        .from("usuario")
        .select("id_usuario")
        .eq("email", session.session.user.email)
        .single()
        .then(({ data: usuario }) => {
          if (!usuario) return;
          
          supabase
            .from("notificacion")
            .update({ leida: true })
            .eq("id_usuario", usuario.id_usuario) // ✅ CAMBIO
            .eq("leida", false)
            .then(({ error }) => {
              if (error) console.error("Error al marcar todas como leídas:", error);
            });
        });
    });
  };

  const formatTime = (fecha) => {
    const now = new Date();
    const notifDate = new Date(fecha);
    const diff = now - notifDate;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return notifDate.toLocaleDateString("es-UY");
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case "venta": return "💰";
      case "compra": return "🛒";
      case "carrito": return "🛒";
      case "favorito": return "❤️";
      case "mensaje": return "💬";
      case "publicacion": return "✨";
      default: return "🔔";
    }
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button
        className="pill notif-bell"
        type="button"
        aria-label="Notificaciones"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown-menu">
          <div className="notif-header">
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-btn">
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <span className="empty-icon">🔕</span>
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.leida ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-icon">{getIcon(notif.tipo)}</div>
                  <div className="notif-content">
                    <div className="notif-title">{notif.titulo}</div>
                    <div className="notif-message">{notif.mensaje}</div>
                    <div className="notif-time">{formatTime(notif.fecha)}</div>
                  </div>
                  <button
                    className="notif-delete"
                    onClick={(e) => deleteNotification(notif.id, e)}
                    aria-label="Eliminar notificación"
                  >
                    ×
                  </button>
                  {!notif.leida && <div className="notif-dot"></div>}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notif-footer">
              <button 
                onClick={() => {
                  setNotifications([]);
                  localStorage.setItem("notifications", JSON.stringify([]));
                  setIsOpen(false);
                  
                  supabase.auth.getSession().then(({ data: session }) => {
                    if (!session?.session?.user?.email) return;
                    
                    supabase
                      .from("usuario")
                      .select("id_usuario")
                      .eq("email", session.session.user.email)
                      .single()
                      .then(({ data: usuario }) => {
                        if (!usuario) return;
                        
                        supabase
                          .from("notificacion")
                          .delete()
                          .eq("id_usuario", usuario.id_usuario) // ✅ CAMBIO
                          .then(({ error }) => {
                            if (error) console.error("Error al limpiar notificaciones:", error);
                          });
                      });
                  });
                }}
                className="clear-all-btn"
              >
                Limpiar todas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}