import React from 'react';
import './ImpostorCard.css';

const ImpostorCard = ({ isImpostor, player, isRevealed }) => {
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

  return (
    <div className="impostor-card player">
      <div className="card-content">
        <div className="player-image-container">
          <img 
            src={player.image_url} 
            alt={player.name}
            className="player-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/200x200?text=Jugador';
            }}
          />
        </div>
        <h1 className="player-name">{player.name}</h1>
        <div className="player-info">
          <span className="player-badge">{player.position}</span>
          <span className="player-badge">{player.nationality}</span>
        </div>
        <div className="player-club">{player.club}</div>
        <div className="player-instruction">
          ⚽ Este es tu jugador<br />
          Da pistas sin ser muy obvio
        </div>
      </div>
    </div>
  );
};

export default ImpostorCard;