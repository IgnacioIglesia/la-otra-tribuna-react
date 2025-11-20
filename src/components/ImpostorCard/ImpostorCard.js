import React, { useState, useEffect } from 'react';
import './ImpostorCard.css';

const ImpostorCard = ({ isImpostor, player, isRevealed, onHideRole }) => {
  const [imageError, setImageError] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isRevealed) {
      // Iniciar con el card invisible y colapsado
      setIsVisible(true);
      setAnimationClass('revealing');
      
      // Remover la clase de animación después de que termine
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setAnimationClass('');
    }
  }, [isRevealed]);

  const handleHideRole = () => {
    setAnimationClass('hiding');
    
    // Esperar a que termine la animación antes de ocultar
    setTimeout(() => {
      setAnimationClass('');
      onHideRole();
    }, 800);
  };

  if (!isRevealed) {
    return (
      <div className="impostor-card waiting">
        <div className="card-content">
          <div className="waiting-icon">⏳</div>
          <h2>Esperando...</h2>
          <p>La ronda está por comenzar</p>
        </div>
      </div>
    );
  }

  if (isImpostor) {
    return (
      <div className={`impostor-card impostor ${animationClass}`}>
        <div className="card-content">
          <div className="impostor-icon">🎭</div>
          <h1 className="impostor-title">¡ERES EL IMPOSTOR!</h1>
          <p className="impostor-subtitle">
            Los demás tienen un jugador asignado.
            <br />
            ¡Descubre quién es sin que te descubran!
          </p>

          <button
            className="impostor-hide-role-btn"
            onClick={handleHideRole}
          >
            <span className="hide-btn-icon">🙈</span>
            <span className="hide-btn-text">Ocultar mi rol</span>
          </button>
        </div>
      </div>
    );
  }

  const getImageUrl = () => {
    if (player?.image_url && !imageError) {
      return player.image_url;
    }

    const playerName = player?.name || 'Jugador';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      playerName
    )}&size=300&background=1a5c1e&color=a8ff78&bold=true&font-size=0.4`;
  };

  return (
    <div className={`impostor-card player ${animationClass}`}>
      <div className="card-content">
        <div className="player-image-container">
          <img
            src={getImageUrl()}
            alt={player?.name || 'Jugador'}
            className="player-image"
            onError={() => {
              console.error(
                '❌ Error cargando imagen:',
                player?.name,
                player?.image_url
              );
              setImageError(true);
            }}
            onLoad={() => {
              console.log('✅ Imagen cargada:', player?.name);
            }}
            loading="eager"
          />
        </div>

        <h1 className="player-name">
          {player?.name || 'Jugador Desconocido'}
        </h1>

        <div className="player-info">
          <span className="player-badge">
            {player?.position || 'Posición desconocida'}
          </span>
          <span className="player-badge">
            {player?.nationality || 'Nacionalidad desconocida'}
          </span>
        </div>

        <button
          className="impostor-hide-role-btn"
          onClick={handleHideRole}
        >
          <span className="hide-btn-icon">🙈</span>
          <span className="hide-btn-text">Ocultar mi rol</span>
        </button>
      </div>
    </div>
  );
};

export default ImpostorCard;