import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
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
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const isHost = location.state?.isHost || false;

  useEffect(() => {
    initializeRoom();
  }, [roomCode]);

  // ✅ Suscripciones en tiempo real
  useEffect(() => {
    if (!roomCode) return;

    // Suscribirse a cambios en jugadores
    const playersSubscription = impostorService.subscribeToRoomPlayers(
      roomCode,
      async () => {
        await loadRoomPlayers();
      }
    );

    // Suscribirse a cambios en el estado de la sala
    const statusSubscription = impostorService.subscribeToRoomStatus(
      roomCode,
      async (payload) => {
        if (payload.new.status === 'playing') {
          setGameStarted(true);
          await loadRoom();
        }
      }
    );

    return () => {
      supabase.removeChannel(playersSubscription);
      supabase.removeChannel(statusSubscription);
    };
  }, [roomCode]);

  const initializeRoom = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Debes iniciar sesión');
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      // Cargar sala
      await loadRoom();
      
      // Obtener perfil para username
      const { data: profile } = await supabase
        .from('perfil')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      const username = profile?.username || user.email?.split('@')[0] || 'Jugador';

      // Unirse automáticamente a la sala
      try {
        const joinResult = await impostorService.joinRoom(roomCode, user.id, username);
        setPlayerNumber(joinResult.playerNumber);
        console.log('Jugador asignado al número:', joinResult.playerNumber);
      } catch (joinError) {
        console.error('Error al unirse:', joinError);
        // Si hay error, intentar limpiar y volver a unirse
        if (joinError.message?.includes('duplicate') || joinError.code === '23505') {
          console.log('Detectado duplicado, limpiando e intentando de nuevo...');
          await impostorService.leaveRoom(roomCode, user.id);
          const retryResult = await impostorService.joinRoom(roomCode, user.id, username);
          setPlayerNumber(retryResult.playerNumber);
        } else {
          throw joinError;
        }
      }

      // Cargar jugadores
      await loadRoomPlayers();

      setLoading(false);
    } catch (err) {
      console.error('Error inicializando sala:', err);
      setError(err.message || 'Error al cargar la sala');
      setLoading(false);
    }
  };

  const loadRoom = async () => {
    try {
      const roomData = await impostorService.getRoom(roomCode);
      setRoom(roomData);
      setGameStarted(roomData.status === 'playing');
    } catch (err) {
      console.error('Error cargando sala:', err);
      throw err;
    }
  };

  const loadRoomPlayers = async () => {
    try {
      const players = await impostorService.getRoomPlayers(roomCode);
      setRoomPlayers(players);
    } catch (err) {
      console.error('Error cargando jugadores:', err);
    }
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
      console.error('Error iniciando juego:', err);
      setError(err.message || 'Error al iniciar el juego');
      setLoading(false);
    }
  };

  const revealRole = async () => {
    if (!playerNumber) {
      setError('Número de jugador no asignado');
      return;
    }

    try {
      setLoading(true);
      const role = await impostorService.getPlayerRole(roomCode, playerNumber);
      setPlayerRole(role);
      setIsRevealed(true);
      setLoading(false);
    } catch (err) {
      console.error('Error obteniendo rol:', err);
      setError(err.message || 'Error al obtener tu rol');
      setLoading(false);
    }
  };

  const newRound = async () => {
    setIsRevealed(false);
    setPlayerRole(null);
    await startGame();
  };

  const exitGame = () => {
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
      <Header />
      
      <div className="impostor-game-container">
        {/* Header */}
        <div className="impostor-game-header">
          <div className="impostor-game-room-info">
            <h2>Sala: <span className="impostor-game-room-code">{roomCode}</span></h2>
            <p>
              {roomPlayers.length}/{room.num_players} jugadores · {room.num_impostors} impostor{room.num_impostors > 1 ? 'es' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {playerNumber && (
              <span className="impostor-game-host-badge" style={{ background: 'rgba(255,255,255,0.2)' }}>
                🎮 Jugador #{playerNumber}
              </span>
            )}
            {isHost && (
              <span className="impostor-game-host-badge">👑 Host</span>
            )}
          </div>
        </div>

        {/* Sala de Espera */}
        {!gameStarted && (
          <div className="impostor-game-waiting-room">
            <h2>🎮 Sala de Espera</h2>
            <p className="impostor-game-waiting-instructions">
              Esperando a que todos los jugadores se unan...
            </p>

            {/* Lista de jugadores conectados */}
            <div style={{ marginTop: '30px', marginBottom: '30px' }}>
              <h3 style={{ color: '#a8ff78', marginBottom: '20px', textAlign: 'center' }}>
                Jugadores conectados ({roomPlayers.length}/{room.num_players})
              </h3>
              <div className="impostor-game-player-grid">
                {Array.from({ length: room.num_players }, (_, i) => i + 1).map((num) => {
                  const player = roomPlayers.find(p => p.player_number === num);
                  return (
                    <div
                      key={num}
                      className={`impostor-game-player-slot ${player ? 'selected' : ''} ${playerNumber === num ? 'current' : ''}`}
                      style={{
                        cursor: 'default',
                        border: playerNumber === num ? '3px solid #a8ff78' : undefined
                      }}
                    >
                      {player ? (
                        <>
                          <span className="impostor-game-player-number">{num}</span>
                          <div style={{ 
                            fontSize: '0.8rem', 
                            marginTop: '5px',
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: '600',
                            textAlign: 'center',
                            wordBreak: 'break-word'
                          }}>
                            {player.username}
                          </div>
                          {playerNumber === num && (
                            <div style={{
                              position: 'absolute',
                              top: '5px',
                              right: '5px',
                              background: '#a8ff78',
                              color: '#0a3d0c',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.9rem',
                              fontWeight: 'bold'
                            }}>
                              ✓
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="impostor-game-player-number">{num}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="impostor-game-error">⚠️ {error}</div>
            )}

            {isHost && (
              <button
                onClick={startGame}
                disabled={loading || roomPlayers.length < 3}
                className="impostor-game-btn impostor-game-btn-primary impostor-game-btn-large"
                style={{
                  opacity: roomPlayers.length < 3 ? 0.5 : 1
                }}
              >
                {loading ? '⏳ Iniciando...' : 
                 roomPlayers.length < 3 ? `⏳ Esperando más jugadores (${roomPlayers.length}/3 mínimo)` :
                 '🚀 Iniciar Ronda'}
              </button>
            )}

            {!isHost && (
              <p className="impostor-game-waiting-host">
                {roomPlayers.length < 3 
                  ? `⏳ Esperando más jugadores (${roomPlayers.length}/3 mínimo)`
                  : '⏳ Esperando a que el host inicie la ronda...'
                }
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
          ← Salir de la Sala
        </button>
      </div>
    </>
  );
};

export default ImpostorGame;