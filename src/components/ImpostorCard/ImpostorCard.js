import React, { useState } from 'react';
import './ImpostorCard.css';

const ImpostorCard = ({ isImpostor, player, isRevealed, onHideRole }) => {
  const [imageError, setImageError] = useState(false);

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
      <div className="impostor-card impostor">
        <div className="card-content">
          <div className="impostor-icon">🎭</div>
          <h1 className="impostor-title">¡ERES EL IMPOSTOR!</h1>
          <p className="impostor-subtitle">
            Los demás tienen un jugador asignado.
            <br />
            ¡Descubre quién es sin que te descubran!
          </p>

          {/* Botón dentro de la card, en lugar del texto "mantén esto en secreto" */}
          <button
            className="impostor-game-btn-secondary"
            onClick={onHideRole}
          >
            🙈 Ocultar Rol
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
    <div className="impostor-card player">
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

        {/* Antes acá tenías el texto "Este es tu jugador" + botón abajo.
            Ahora dejamos SOLO el botón, bien accesible */}
        <button
          className="impostor-game-btn-secondary"
          onClick={onHideRole}
        >
          🙈 Ocultar Rol
        </button>
      </div>
    </div>
  );
};

export default ImpostorCard;
