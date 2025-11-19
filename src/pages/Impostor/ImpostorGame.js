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
  
  // ✅ Control de impostores
  const [numImpostors, setNumImpostors] = useState(1);
  const [isEditingImpostors, setIsEditingImpostors] = useState(false);
  
  // ✅ NUEVO: Notificaciones
  const [notification, setNotification] = useState(null);
  
  const isHost = location.state?.isHost || false;
  const hasLoadedRole = useRef(false);
  const previousPlayerIdRef = useRef(null);

  useEffect(() => {
    initializeRoom();
  }, [roomCode]);

  // ✅ MEJORADO: Detectar si el host se va y cerrar sala
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
          
          if (room.host_user_id && payload.old.user_id === room.host_user_id) {
            console.log('👑 El host abandonó la sala, cerrando...');
            
            showNotification(
              '👑 El host abandonó la sala',
              'La partida ha sido cancelada',
              'error',
              5000
            );
            
            await impostorService.endRoom(roomCode);
            
            setTimeout(() => {
              navigate('/impostor');
            }, 3000);
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
          
          // ✅ NUEVO: Notificación de nueva ronda
          showNotification(
            '🎮 ¡Nueva Ronda!',
            'Los roles han sido asignados. Prepárate para ver tu rol.',
            'success',
            3000
          );
          
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
          
          showNotification(
            '🎮 ¡Nueva Ronda!',
            'Los roles han sido asignados. Prepárate para ver tu rol.',
            'success',
            3000
          );
          
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

  // ✅ NUEVO: Función para mostrar notificaciones
  const showNotification = (title, message, type = 'info', duration = 4000) => {
    setNotification({ title, message, type });
    
    if (duration) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };

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
      
      const { data: profile } = await supabase
        .from('perfil')
        .select('nombre, apellido, username')
        .eq('user_id', user.id)
        .maybeSingle();

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
      
      // ✅ NUEVO: Detectar cambio de jugador actual
      if (previousPlayerIdRef.current && 
          previousPlayerIdRef.current !== roomData.current_player_id &&
          gameStarted) {
        showNotification(
          '🔄 ¡Cambio de Turno!',
          'El jugador actual ha cambiado. Nuevo jugador seleccionado.',
          'warning',
          3000
        );
      }
      
      previousPlayerIdRef.current = roomData.current_player_id;
      
      setRoom(roomData);
      setNumImpostors(roomData.num_impostors);
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

  const updateImpostors = async () => {
    try {
      setLoading(true);
      await impostorService.updateRoomImpostors(roomCode, numImpostors);
      await loadRoom();
      setIsEditingImpostors(false);
      setLoading(false);
      
      showNotification(
        '✅ Configuración Actualizada',
        `Número de impostores: ${numImpostors}`,
        'success',
        3000
      );
    } catch (err) {
      console.error('Error actualizando impostores:', err);
      setError('Error al actualizar impostores');
      setLoading(false);
      
      showNotification(
        '❌ Error',
        'No se pudo actualizar la configuración',
        'error',
        3000
      );
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
        numImpostors
      );

      setRoom(prev => ({
        ...prev,
        current_player_id: result.selectedPlayer.id,
        status: 'playing'
      }));
      
      previousPlayerIdRef.current = result.selectedPlayer.id;
      hasLoadedRole.current = false;
      setGameStarted(true);
      setLoading(false);
      
      showNotification(
        '🚀 ¡Ronda Iniciada!',
        'Los roles han sido asignados a todos los jugadores',
        'success',
        3000
      );
    } catch (err) {
      console.error('Error iniciando juego:', err);
      setError(err.message || 'Error al iniciar el juego');
      setLoading(false);
      
      showNotification(
        '❌ Error',
        'No se pudo iniciar la ronda',
        'error',
        3000
      );
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
      
      {/* ✅ NUEVO: Componente de Notificaciones */}
      {notification && (
        <div className={`impostor-game-notification impostor-game-notification-${notification.type}`}>
          <div className="impostor-game-notification-content">
            <h3>{notification.title}</h3>
            <p>{notification.message}</p>
          </div>
          <div className="impostor-game-notification-progress"></div>
        </div>
      )}
      
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

            {isHost && (
              <div className="impostor-game-config-section">
                <h3 className="impostor-game-config-title">⚙️ Configuración</h3>
                
                {!isEditingImpostors ? (
                  <div className="impostor-game-config-display">
                    <p className="impostor-game-config-label">
                      Número de impostores:
                    </p>
                    <p className="impostor-game-config-value">{numImpostors}</p>
                    <button
                      onClick={() => setIsEditingImpostors(true)}
                      className="impostor-game-btn-config impostor-game-btn-config-edit"
                    >
                      ✏️ Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="impostor-game-config-editor">
                    <label className="impostor-game-config-range-label">
                      Impostores: <span className="impostor-game-config-range-value">{numImpostors}</span>
                      <span className="impostor-game-config-range-hint">
                        (máx: {maxImpostorsForCurrentPlayers} con {roomPlayers.length} jugadores)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={maxImpostorsForCurrentPlayers}
                      value={Math.min(numImpostors, maxImpostorsForCurrentPlayers)}
                      onChange={(e) => setNumImpostors(parseInt(e.target.value))}
                      className="impostor-game-slider"
                    />
                    <div className="impostor-game-config-buttons">
                      <button
                        onClick={updateImpostors}
                        disabled={loading}
                        className="impostor-game-btn-config impostor-game-btn-config-save"
                      >
                        {loading ? '⏳' : '✅'} Guardar
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingImpostors(false);
                          setNumImpostors(room.num_impostors);
                        }}
                        className="impostor-game-btn-config impostor-game-btn-config-cancel"
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