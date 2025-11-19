import React, { useState } from 'react';
import './ImpostorCard.css';

const ImpostorCard = ({ isImpostor, player, isRevealed }) => {
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
            Los demás tienen un jugador asignado.<br />
            ¡Descubre quién es sin que te descubran!
          </p>
          <div className="impostor-warning">
            🤫 Mantén esto en secreto
          </div>
        </div>
      </div>
    );
  }

  // ✅ CORREGIDO: Mejorar el manejo de imágenes
  const getImageUrl = () => {
    // Si hay error o no hay URL, usar avatar generado
    if (!player?.image_url || imageError) {
      const playerName = player?.name || 'Jugador';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&size=300&background=1a5c1e&color=a8ff78&bold=true&font-size=0.4`;
    }
    
    // Retornar la URL de la imagen
    return player.image_url;
  };

  return (
    <div className="impostor-card player">
      <div className="card-content">
        <div className="player-image-container">
          <img 
            src={getImageUrl()}
            alt={player?.name || 'Jugador'}
            className="player-image"
            onError={(e) => {
              console.error('❌ Error cargando imagen de:', player?.name, '| URL:', player?.image_url);
              setImageError(true);
              // Recargar con el fallback
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player?.name || 'Jugador')}&size=300&background=1a5c1e&color=a8ff78&bold=true&font-size=0.4`;
            }}
            onLoad={() => {
              console.log('✅ Imagen cargada correctamente:', player?.name);
            }}
            loading="eager"
          />
        </div>
        <h1 className="player-name">{player?.name || 'Jugador Desconocido'}</h1>
        <div className="player-info">
          <span className="player-badge">{player?.position || 'N/A'}</span>
          <span className="player-badge">{player?.nationality || 'N/A'}</span>
        </div>
        <div className="player-club">{player?.club || 'Club Desconocido'}</div>
        <div className="player-instruction">
          ⚽ Este es tu jugador<br />
          Da pistas sin ser muy obvio
        </div>
      </div>
    </div>
  );
};

export default ImpostorCard;