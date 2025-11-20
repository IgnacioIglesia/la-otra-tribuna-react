import React from 'react';
import './RoundResultsModal.css';

const RoundResultsModal = ({
  isOpen,
  onClose,
  onNewRound,
  impostorPlayers,
  selectedPlayer,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="results-modal-overlay"
      onClick={onClose}
    >
      <div
        className="results-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="results-modal-close"
        >
          ×
        </button>

        <div className="results-modal-header">
          <div className="results-modal-icon">🏆</div>
          <h2 className="results-modal-title">Resultados de la Ronda</h2>
          <p className="results-modal-subtitle">
            ¡Descubre quién era el impostor!
          </p>
        </div>

        {selectedPlayer && (
          <div className="results-player-section">
            <div className="results-player-icon">⚽</div>
            <h3 className="results-player-label">Jugador de la Ronda</h3>
            <p className="results-player-name">{selectedPlayer.name}</p>
            <div className="results-player-badges">
              <span className="results-badge">{selectedPlayer.position}</span>
              <span className="results-badge">{selectedPlayer.nationality}</span>
            </div>
          </div>
        )}

        <div className="results-impostor-section">
          <div className="results-impostor-header">
            <div className="results-impostor-icon">🎭</div>
            <h3 className="results-impostor-title">
              {impostorPlayers?.length === 1 ? 'El Impostor' : 'Los Impostores'}
            </h3>
          </div>

          {impostorPlayers && impostorPlayers.length > 0 ? (
            <div className="results-impostor-list">
              {impostorPlayers.map((player, index) => (
                <div
                  key={index}
                  className="results-impostor-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="results-impostor-number">
                    #{player.player_number}
                  </div>
                  <div className="results-impostor-info">
                    <div className="results-impostor-username">
                      {player.username}
                    </div>
                    <div className="results-impostor-label">
                      Jugador #{player.player_number}
                    </div>
                  </div>
                  <div className="results-impostor-emoji">🎭</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="results-impostor-empty">
              No hay impostores para mostrar
            </p>
          )}
        </div>

        <div className="results-modal-actions">
          {onNewRound && (
            <button
              onClick={onNewRound}
              className="results-btn results-btn-primary"
            >
              <span className="results-btn-icon">🔄</span>
              Nueva Ronda
            </button>
          )}

          <button
            onClick={onClose}
            className="results-btn results-btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoundResultsModal;
