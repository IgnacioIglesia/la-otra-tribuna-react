import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import impostorService from '../../services/impostorService';
import ImpostorCard from '../../components/ImpostorCard/ImpostorCard';
import Header from '../../components/Header/Header';
import './ImpostorGame.css';

const ImpostorGame = () => {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [playerNumber, setPlayerNumber] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  
  const isHost = location.state?.isHost || false;

  useEffect(() => {
    loadRoom();
    
    const savedPlayerNumber = localStorage.getItem(`impostor_player_${roomCode}`);
    if (savedPlayerNumber) {
      setPlayerNumber(parseInt(savedPlayerNumber));
    }
  }, [roomCode]);

  const loadRoom = async () => {
    try {
      setLoading(true);
      const roomData = await impostorService.getRoom(roomCode);
      setRoom(roomData);
      setGameStarted(roomData.status === 'playing');
      setLoading(false);
    } catch (err) {
      setError('Sala no encontrada');
      setLoading(false);
    }
  };

  const selectPlayerNumber = (number) => {
    setPlayerNumber(number);
    localStorage.setItem(`impostor_player_${roomCode}`, number);
  };

  const startGame = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await impostorService.startRound(
        roomCode,
        room.num_players,
        room.num_impostors
      );

      setRoom(prev => ({
        ...prev,
        current_player_id: result.selectedPlayer.id,
        status: 'playing'
      }));
      
      setGameStarted(true);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Error al iniciar el juego');
      setLoading(false);
    }
  };

  const revealRole = async () => {
    if (!playerNumber) {
      setError('Primero selecciona tu número de jugador');
      return;
    }

    try {
      setLoading(true);
      const role = await impostorService.getPlayerRole(roomCode, playerNumber);
      setPlayerRole(role);
      setIsRevealed(true);
      setLoading(false);
    } catch (err) {
      setError('Error al obtener tu rol');
      setLoading(false);
    }
  };

  const newRound = async () => {
    setIsRevealed(false);
    setPlayerRole(null);
    await startGame();
  };

  const exitGame = () => {
    localStorage.removeItem(`impostor_player_${roomCode}`);
    navigate('/impostor');
  };

  if (loading && !room) {
    return (
      <>
        <Header />
        <div className="impostor-game-container loading">
          <div className="impostor-game-spinner">⏳</div>
          <p>Cargando sala...</p>
        </div>
      </>
    );
  }

  if (error && !room) {
    return (
      <>
        <Header />
        <div className="impostor-game-container error">
          <h2>❌ {error}</h2>
          <button onClick={() => navigate('/impostor')} className="impostor-game-btn impostor-game-btn-primary">
            Volver al Inicio
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* 👇 AGREGADO: Header para integrar con la página */}
      <Header />
      
      <div className="impostor-game-container">
        {/* Header */}
        <div className="impostor-game-header">
          <div className="impostor-game-room-info">
            <h2>Sala: <span className="impostor-game-room-code">{roomCode}</span></h2>
            <p>
              {room.num_players} jugadores · {room.num_impostors} impostor{room.num_impostors > 1 ? 'es' : ''}
            </p>
          </div>
          {isHost && (
            <span className="impostor-game-host-badge">👑 Host</span>
          )}
        </div>

        {/* Sala de Espera */}
        {!gameStarted && (
          <div className="impostor-game-waiting-room">
            <h2>🎮 Sala de Espera</h2>
            <p className="impostor-game-waiting-instructions">
              Cada jugador debe seleccionar su número antes de comenzar
            </p>

            <div className="impostor-game-player-grid">
              {Array.from({ length: room.num_players }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => selectPlayerNumber(num)}
                  className={`impostor-game-player-slot ${playerNumber === num ? 'selected' : ''}`}
                  disabled={gameStarted}
                >
                  <span className="impostor-game-player-number">{num}</span>
                  {playerNumber === num && <span className="impostor-game-check-mark">✓</span>}
                </button>
              ))}
            </div>

            {playerNumber && (
              <div className="impostor-game-selected-info">
                ✅ Eres el Jugador #{playerNumber}
              </div>
            )}

            {error && (
              <div className="impostor-game-error">⚠️ {error}</div>
            )}

            {isHost && (
              <button
                onClick={startGame}
                disabled={loading}
                className="impostor-game-btn impostor-game-btn-primary impostor-game-btn-large"
              >
                {loading ? '⏳ Iniciando...' : '🚀 Iniciar Ronda'}
              </button>
            )}

            {!isHost && (
              <p className="impostor-game-waiting-host">
                ⏳ Esperando a que el host inicie la ronda...
              </p>
            )}
          </div>
        )}

        {/* Juego Activo */}
        {gameStarted && (
          <div className="impostor-game-active">
            {!isRevealed ? (
              <div className="impostor-game-reveal-section">
                <h2>🎭 ¿Listo para ver tu rol?</h2>
                
                {!playerNumber ? (
                  <>
                    <p className="impostor-game-reveal-instructions">
                      Primero selecciona tu número de jugador:
                    </p>
                    <div className="impostor-game-player-grid compact">
                      {Array.from({ length: room.num_players }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          onClick={() => selectPlayerNumber(num)}
                          className={`impostor-game-player-slot ${playerNumber === num ? 'selected' : ''}`}
                        >
                          <span className="impostor-game-player-number">{num}</span>
                          {playerNumber === num && <span className="impostor-game-check-mark">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="impostor-game-reveal-instructions">
                      Asegúrate de que nadie más pueda ver tu pantalla
                    </p>
                    <button
                      onClick={revealRole}
                      disabled={loading}
                      className="impostor-game-btn-reveal"
                    >
                      {loading ? '⏳ Cargando...' : '👁️ Ver Mi Rol'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <ImpostorCard
                  isImpostor={playerRole?.is_impostor}
                  player={playerRole?.footballers}
                  isRevealed={isRevealed}
                />

                <div className="impostor-game-actions">
                  {isHost && (
                    <button
                      onClick={newRound}
                      className="impostor-game-btn impostor-game-btn-primary"
                    >
                      🔄 Nueva Ronda
                    </button>
                  )}
                  <button
                    onClick={() => setIsRevealed(false)}
                    className="impostor-game-btn impostor-game-btn-secondary"
                  >
                    🙈 Ocultar Rol
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Botón Salir */}
        <button onClick={exitGame} className="impostor-game-btn-exit">
          ← Salir
        </button>
      </div>
    </>
  );
};

export default ImpostorGame;