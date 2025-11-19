import React, { useState, useEffect, useRef } from 'react';
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
  
  // ✅ NUEVO: Control de impostores en la sala
  const [numImpostors, setNumImpostors] = useState(1);
  const [isEditingImpostors, setIsEditingImpostors] = useState(false);
  
  const isHost = location.state?.isHost || false;
  const hasLoadedRole = useRef(false);

  useEffect(() => {
    initializeRoom();
  }, [roomCode]);

  // ✅ NUEVO: Detectar si el host se va y cerrar sala
  useEffect(() => {
    if (!roomCode || !room) return;

    const hostSubscription = supabase
      .channel(`room-${roomCode}-host-check`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'impostor_players',
          filter: `room_code=eq.${roomCode}`
        },
        async (payload) => {
          console.log('🚨 Jugador eliminado:', payload.old);
          
          // Verificar si el que se fue era el host
          if (room.host_user_id && payload.old.user_id === room.host_user_id) {
            console.log('👑 El host abandonó la sala, cerrando...');
            
            // Cerrar la sala
            await impostorService.endRoom(roomCode);
            
            // Redirigir a todos
            alert('El host abandonó la sala. La partida ha terminado.');
            navigate('/impostor');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(hostSubscription);
    };
  }, [roomCode, room, navigate]);

  useEffect(() => {
    if (!roomCode) return;

    console.log('🔌 Configurando suscripciones para sala:', roomCode);

    const playersSubscription = impostorService.subscribeToRoomPlayers(
      roomCode,
      async (payload) => {
        console.log('👥 Evento de jugadores:', payload);
        await loadRoomPlayers();
      }
    );

    const statusSubscription = impostorService.subscribeToRoomStatus(
      roomCode,
      async (payload) => {
        console.log('🔔 Evento de sala:', payload);
        
        if (
          (payload.type === 'db_change' && payload.new?.status === 'playing') ||
          (payload.type === 'broadcast' && payload.event === 'game_started')
        ) {
          console.log('✅ ¡Ronda iniciada! Forzando recarga...');
          
          hasLoadedRole.current = false;
          setIsRevealed(false);
          setPlayerRole(null);
          setGameStarted(true);
          
          await loadRoom();
        }
      }
    );

    const pollingInterval = setInterval(async () => {
      try {
        const roomData = await impostorService.getRoom(roomCode);
        if (roomData.status === 'playing' && !gameStarted) {
          console.log('⏰ Polling detectó inicio de ronda');
          hasLoadedRole.current = false;
          setIsRevealed(false);
          setPlayerRole(null);
          setGameStarted(true);
          await loadRoom();
        }
      } catch (error) {
        console.error('Error en polling:', error);
      }
    }, 2000);

    return () => {
      console.log('🔌 Limpiando suscripciones');
      supabase.removeChannel(playersSubscription);
      supabase.removeChannel(statusSubscription);
      clearInterval(pollingInterval);
    };
  }, [roomCode, gameStarted]);

  const initializeRoom = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Debes iniciar sesión');
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      await loadRoom();
      
      // ✅ CAMBIO: Obtener nombre completo del perfil
      const { data: profile } = await supabase
        .from('perfil')
        .select('nombre, apellido, username')
        .eq('user_id', user.id)
        .maybeSingle();

      // Priorizar nombre + apellido, luego username, luego email
      const username = profile?.nombre && profile?.apellido
        ? `${profile.nombre} ${profile.apellido}`
        : profile?.username || user.email?.split('@')[0] || 'Jugador';

      try {
        const joinResult = await impostorService.joinRoom(roomCode, user.id, username);
        setPlayerNumber(joinResult.playerNumber);
        console.log('✅ Jugador asignado al número:', joinResult.playerNumber);
      } catch (joinError) {
        console.error('Error al unirse:', joinError);
        if (joinError.message?.includes('duplicate') || joinError.code === '23505') {
          console.log('Detectado duplicado, limpiando...');
          await impostorService.leaveRoom(roomCode, user.id);
          const retryResult = await impostorService.joinRoom(roomCode, user.id, username);
          setPlayerNumber(retryResult.playerNumber);
        } else {
          throw joinError;
        }
      }

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
      setNumImpostors(roomData.num_impostors); // ✅ Sincronizar impostores
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

  // ✅ NUEVO: Actualizar número de impostores
  const updateImpostors = async () => {
    try {
      setLoading(true);
      await impostorService.updateRoomImpostors(roomCode, numImpostors);
      await loadRoom();
      setIsEditingImpostors(false);
      setLoading(false);
    } catch (err) {
      console.error('Error actualizando impostores:', err);
      setError('Error al actualizar impostores');
      setLoading(false);
    }
  };

  const startGame = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🎮 Host iniciando juego...');
      const result = await impostorService.startRound(
        roomCode,
        room.num_players,
        numImpostors // ✅ Usar el número actualizado
      );

      setRoom(prev => ({
        ...prev,
        current_player_id: result.selectedPlayer.id,
        status: 'playing'
      }));
      
      hasLoadedRole.current = false;
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

    if (hasLoadedRole.current && playerRole) {
      setIsRevealed(true);
      return;
    }

    try {
      setLoading(true);
      const role = await impostorService.getPlayerRole(roomCode, playerNumber);
      console.log('🎭 Rol obtenido:', role);
      setPlayerRole(role);
      setIsRevealed(true);
      hasLoadedRole.current = true;
      setLoading(false);
    } catch (err) {
      console.error('Error obteniendo rol:', err);
      setError(err.message || 'Error al obtener tu rol');
      setLoading(false);
    }
  };

  const newRound = async () => {
    hasLoadedRole.current = false;
    setIsRevealed(false);
    setPlayerRole(null);
    await startGame();
  };

  // ✅ MEJORADO: Si eres host, elimina la sala al salir
  const exitGame = async () => {
    try {
      if (isHost && currentUser) {
        await impostorService.leaveRoom(roomCode, currentUser.id);
        await impostorService.endRoom(roomCode);
      } else if (currentUser) {
        await impostorService.leaveRoom(roomCode, currentUser.id);
      }
    } catch (err) {
      console.error('Error al salir:', err);
    } finally {
      navigate('/impostor');
    }
  };

  // ✅ NUEVO: Calcular máximo de impostores según jugadores conectados
  const maxImpostorsForCurrentPlayers = Math.min(4, Math.max(1, Math.floor(roomPlayers.length / 2) - 1));

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
        <div className="impostor-game-header">
          <div className="impostor-game-room-info">
            <h2>Sala: <span className="impostor-game-room-code">{roomCode}</span></h2>
            <p>
              {roomPlayers.length} jugadores conectados · {numImpostors} impostor{numImpostors > 1 ? 'es' : ''}
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

        {!gameStarted && (
          <div className="impostor-game-waiting-room">
            <h2>🎮 Sala de Espera</h2>
            <p className="impostor-game-waiting-instructions">
              Esperando a que todos los jugadores se unan...
            </p>

            {/* ✅ NUEVO: Control de impostores en sala */}
            {isHost && (
              <div style={{ 
                marginTop: '20px', 
                marginBottom: '30px',
                background: 'rgba(168, 255, 120, 0.1)',
                padding: '20px',
                borderRadius: '15px',
                border: '2px solid rgba(168, 255, 120, 0.3)'
              }}>
                <h3 style={{ color: '#a8ff78', marginBottom: '15px', textAlign: 'center' }}>
                  ⚙️ Configuración
                </h3>
                
                {!isEditingImpostors ? (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
                      Número de impostores: <strong style={{ color: '#a8ff78', fontSize: '1.3rem' }}>{numImpostors}</strong>
                    </p>
                    <button
                      onClick={() => setIsEditingImpostors(true)}
                      className="impostor-game-btn impostor-game-btn-secondary"
                      style={{ padding: '10px 20px', fontSize: '0.9rem', marginTop: '10px' }}
                    >
                      ✏️ Cambiar
                    </button>
                  </div>
                ) : (
                  <div>
                    <label style={{ 
                      display: 'block',
                      color: 'rgba(255,255,255,0.95)',
                      marginBottom: '10px',
                      fontWeight: '600'
                    }}>
                      Impostores: <strong style={{ color: '#a8ff78', fontSize: '1.3rem' }}>{numImpostors}</strong>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 'normal', 
                        marginLeft: '10px',
                        opacity: 0.8 
                      }}>
                        (máx: {maxImpostorsForCurrentPlayers} con {roomPlayers.length} jugadores)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={maxImpostorsForCurrentPlayers}
                      value={Math.min(numImpostors, maxImpostorsForCurrentPlayers)}
                      onChange={(e) => setNumImpostors(parseInt(e.target.value))}
                      className="impostor-slider"
                      style={{ width: '100%', marginBottom: '15px' }}
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button
                        onClick={updateImpostors}
                        disabled={loading}
                        className="impostor-game-btn impostor-game-btn-primary"
                        style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                      >
                        {loading ? '⏳' : '✅'} Guardar
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingImpostors(false);
                          setNumImpostors(room.num_impostors);
                        }}
                        className="impostor-game-btn impostor-game-btn-secondary"
                        style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '30px', marginBottom: '30px' }}>
              <h3 style={{ color: '#a8ff78', marginBottom: '20px', textAlign: 'center' }}>
                Jugadores conectados ({roomPlayers.length})
              </h3>
              <div className="impostor-game-player-grid">
                {roomPlayers.map((player) => (
                  <div
                    key={player.player_number}
                    className="impostor-game-player-slot selected"
                    style={{
                      cursor: 'default',
                      border: playerNumber === player.player_number ? '3px solid #a8ff78' : undefined
                    }}
                  >
                    <span className="impostor-game-player-number">{player.player_number}</span>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      marginTop: '5px',
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: '600',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      padding: '0 5px'
                    }}>
                      {player.username}
                    </div>
                    {playerNumber === player.player_number && (
                      <div className="impostor-game-check-mark">✓</div>
                    )}
                  </div>
                ))}
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

        {gameStarted && (
          <div className="impostor-game-active">
            {!isRevealed ? (
              <div className="impostor-game-reveal-section">
                <h2>🎭 ¿Listo para ver tu rol?</h2>
                <p className="impostor-game-reveal-instructions">
                  Asegúrate de que nadie más pueda ver tu pantalla
                </p>
                {error && (
                  <div className="impostor-game-error" style={{ marginBottom: '20px' }}>
                    ⚠️ {error}
                  </div>
                )}
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

        <button onClick={exitGame} className="impostor-game-btn-exit">
          ← Salir de la Sala
        </button>
      </div>
    </>
  );
};

export default ImpostorGame;