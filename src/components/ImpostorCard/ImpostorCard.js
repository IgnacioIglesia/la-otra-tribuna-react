import React, { useState, useEffect } from 'react';
import './ImpostorCard.css';

const ImpostorCard = ({ isImpostor, player, isRevealed, onHideRole }) => {
  const [imageError, setImageError] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isRevealed && !isFlipped) {
      // Flip para revelar
      setIsAnimating(true);
      setTimeout(() => {
        setIsFlipped(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 600);
      }, 50);
    }
  }, [isRevealed, isFlipped]);

  const handleHideRole = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    // Flip para ocultar (gira en la misma dirección)
    setIsFlipped(false);
    
    setTimeout(() => {
      setIsAnimating(false);
      onHideRole();
    }, 600);
  };

  // Reset cuando cambia isRevealed a false externamente
  useEffect(() => {
    if (!isRevealed) {
      setIsFlipped(false);
      setIsAnimating(false);
    }
  }, [isRevealed]);

  const getImageUrl = () => {
    if (player?.image_url && !imageError) {
      return player.image_url;
    }
    const playerName = player?.name || 'Jugador';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      playerName
    )}&size=300&background=1a5c1e&color=a8ff78&bold=true&font-size=0.4`;
  };

  // Contenido del frente de la carta (oculto)
  const CardBack = () => (
    <div className="card-face card-back">
      <div className="card-back-content">
        <div className="card-back-icon">❓</div>
        <h2>Tu Rol</h2>
        <p>Toca para revelar</p>
        <div className="card-back-pattern"></div>
      </div>
    </div>
  );

  // Contenido del reverso de la carta (revelado)
  const CardFront = () => {
    if (isImpostor) {
      return (
        <div className="card-face card-front impostor-front">
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
              disabled={isAnimating}
            >
              <span className="hide-btn-icon">🙈</span>
              <span className="hide-btn-text">Ocultar mi rol</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="card-face card-front player-front">
        <div className="card-content">
          <div className="player-image-container">
            <img
              src={getImageUrl()}
              alt={player?.name || 'Jugador'}
              className="player-image"
              onError={() => {
                console.error('❌ Error cargando imagen:', player?.name, player?.image_url);
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
            disabled={isAnimating}
          >
            <span className="hide-btn-icon">🙈</span>
            <span className="hide-btn-text">Ocultar mi rol</span>
          </button>
        </div>
      </div>
    );
  };

  if (!isRevealed && !isFlipped && !isAnimating) {
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

  return (
    <div className={`impostor-card-container ${isImpostor ? 'is-impostor' : 'is-player'}`}>
      <div className={`impostor-card-flipper ${isFlipped ? 'flipped' : ''} ${isAnimating ? 'animating' : ''}`}>
        <CardBack />
        <CardFront />
      </div>
    </div>
  );
};

export default ImpostorCard;