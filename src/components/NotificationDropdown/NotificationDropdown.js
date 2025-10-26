// src/components/NotificationDropdown/NotificationDropdown.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../Favorites/FavoritesContext";
import { useCart } from "../Cart/CartContext";
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

  // Detectar cambios en favoritos y carrito
  useEffect(() => {
    const storedNotifs = JSON.parse(localStorage.getItem("notifications") || "[]");
    
    // Limpiar notificaciones antiguas (más de 7 días)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const cleanedNotifs = storedNotifs.filter(n => new Date(n.fecha).getTime() > sevenDaysAgo);
    
    setNotifications(cleanedNotifs);
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
  };

  const deleteNotification = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem("notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const handleNotificationClick = (notif) => {
    if (!notif.leida) {
      markAsRead(notif.id);
    }

    setIsOpen(false);

    // Navegar según el tipo de notificación
    switch (notif.tipo) {
      case "venta":
        navigate("/my-sales");
        break;
      case "compra":
        navigate("/my-orders");
        break;
      case "carrito":
        // Si tiene id_publicacion, ir a la publicación, sino abrir carrito
        if (notif.id_publicacion) {
          navigate(`/publication/${notif.id_publicacion}`);
        } else {
          window.dispatchEvent(new CustomEvent("open-cart"));
        }
        break;
      case "favorito":
        // Si tiene id_publicacion, ir a la publicación, sino ir a favoritos
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