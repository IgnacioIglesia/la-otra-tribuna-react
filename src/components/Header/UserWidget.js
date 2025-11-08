import React, { useState } from 'react';
import '../../styles/user-widget.css';

function UserWidget() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Estado temporal - luego conectaremos con autenticación
  const [isLoggedIn] = useState(false);
  const user = { name: '', email: '' };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!isLoggedIn) {
    return (
      <a href="/login" className="btn-login">
        Iniciar sesión
      </a>
    );
  }

  return (
    <div className="user-widget" onClick={toggleMenu}>
      <div className="user-avatar" title="Mi perfil">
        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
      </div>
      <span className="user-greeting">
        Hola, {user.name || 'Usuario'}!
      </span>
      
      <div className={`user-menu ${isMenuOpen ? '' : 'hidden'}`}>
        <a href="/perfil">👤 Perfil</a>
        <a href="/mis-publicaciones">📊 Mis Publicaciones</a>
        <a href="/mis-pedidos">🧾 Mis pedidos</a>
        <a href="/logout" className="menu-divider">🚪 Cerrar sesión</a>
      </div>
    </div>
  );
}

export default UserWidget;

