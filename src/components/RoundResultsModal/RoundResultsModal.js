import React from 'react';
import './RoundResultsModal.css';

const RoundResultsModal = ({ isOpen, onClose, onNewRound, impostorPlayers, selectedPlayer }) => {
  if (!isOpen) return null;

  return (
    <div className="round-results-overlay" onClick={onClose}>
      <div className="round-results-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <div className="modal-icon">🎭</div>
          <h2>Fin de Ronda</h2>
        </div>

        <div className="modal-content">
          <div className="selected-player-section">
            <h3>⚽ Jugador de esta ronda:</h3>
            <div className="player-reveal">
              <div className="player-avatar">
                <img 
                  src={selectedPlayer?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer?.name || 'Jugador')}&size=120&background=1a5c1e&color=a8ff78&bold=true`}
                  alt={selectedPlayer?.name}
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer?.name || 'Jugador')}&size=120&background=1a5c1e&color=a8ff78&bold=true`;
                  }}
                />
              </div>
              <h4>{selectedPlayer?.name}</h4>
              <div className="player-details">
                <span>{selectedPlayer?.position}</span>
                <span>{selectedPlayer?.nationality}</span>
              </div>
            </div>
          </div>

          <div className="impostor-reveal-section">
            <h3>🎭 {impostorPlayers?.length > 1 ? 'Los impostores fueron:' : 'El impostor fue:'}</h3>
            <div className="impostor-list">
              {impostorPlayers && impostorPlayers.length > 0 ? (
                impostorPlayers.map((impostor, index) => (
                  <div key={index} className="impostor-badge-large">
                    <span className="impostor-number">#{impostor.player_number}</span>
                    <span className="impostor-name">{impostor.username}</span>
                  </div>
                ))
              ) : (
                <p className="no-impostors">No se encontraron impostores</p>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {onNewRound ? (
            <div className="modal-footer-buttons">
              <button className="modal-action-btn primary" onClick={onNewRound}>
                🔄 Nueva Ronda
              </button>
              <button className="modal-action-btn secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          ) : (
            <button className="modal-action-btn primary" onClick={onClose}>
              ✓ Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundResultsModal;