import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import impostorService from '../../services/impostorService';
import ImpostorCard from '../../components/ImpostorCard/ImpostorCard';
import RoundResultsModal from '../../components/RoundResultsModal/RoundResultsModal';
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
  
  const [numImpostors, setNumImpostors] = useState(1);
  const [isEditingImpostors, setIsEditingImpostors] = useState(false);
  
  const [notification, setNotification] = useState(null);
  
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [roundResults, setRoundResults] = useState(null);
  
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  const isHost = location.state?.isHost || false;
  const hasLoadedRole = useRef(false);
  const previousPlayerIdRef = useRef(null);

  useEffect(() => {
    initializeRoom();
  }, [roomCode]);

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
            
            const channel = supabase.channel(`room-${roomCode}-closed-broadcast`);
            
            await channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                await channel.send({
                  type: 'broadcast',
                  event: 'room_closed',
                  payload: { 
                    roomCode,
                    reason: 'host_left',
                    timestamp: new Date().toISOString()
                  }
                });
                console.log('📡 Broadcast enviado: room_closed');
                
                setTimeout(() => {
                  supabase.removeChannel(channel);
                }, 1000);
              }
            });
            
            showNotification(
              'El host abandonó la sala',
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

    const roomStatusSubscription = supabase
      .channel(`room-${roomCode}-status-check`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'impostor_rooms',
          filter: `room_code=eq.${roomCode}`
        },
        async (payload) => {
          console.log('🏠 Estado de sala actualizado:', payload.new);
          
          if (payload.new.status === 'finished') {
            console.log('❌ Sala cerrada, redirigiendo...');
            
            showNotification(
              'Sala Cerrada',
              'La sala ha sido cerrada por el host',
              'error',
              3000
            );
            
            setTimeout(() => {
              navigate('/impostor');
            }, 3000);
          }
        }
      )
      .subscribe();

    const closedBroadcastSubscription = supabase
      .channel(`room-${roomCode}-closed-listener`)
      .on(
        'broadcast',
        { event: 'room_closed' },
        async (payload) => {
          console.log('📡 Broadcast recibido: sala cerrada', payload);
          
          showNotification(
            'Sala Cerrada',
            'El host ha abandonado la sala. Serás redirigido...',
            'error',
            3000
          );
          
          setTimeout(() => {
            navigate('/impostor');
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(hostSubscription);
      supabase.removeChannel(roomStatusSubscription);
      supabase.removeChannel(closedBroadcastSubscription);
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
          
          showNotification(
            '¡Nueva Ronda!',
            'Los roles han sido asignados. Prepárate para ver tu rol.',
            'success',
            3000
          );
          
          await loadRoom();
        }
      }
    );

    // ✅ ARREGLADO: Suscripción para que TODOS reciban los resultados
    const resultsSubscription = supabase
      .channel(`room-${roomCode}-results`)
      .on(
        'broadcast',
        { event: 'show_results' },
        async (payload) => {
          console.log('📊 Broadcast recibido: mostrar resultados');
          
          try {
            const sessions = await impostorService.getRoomSessions(roomCode);
            const currentImpostors = sessions.filter(s => s.is_impostor);
            
            const impostorPlayersList = roomPlayers.filter(p => 
              currentImpostors.some(s => s.player_number === p.player_number)
            );
            
            setRoundResults({
              impostorPlayers: impostorPlayersList,
              selectedPlayer: room.footballers
            });
            
            setShowResultsModal(true);
            
            showNotification(
              '📊 Resultados Disponibles',
              'El host ha revelado los resultados de la ronda',
              'info',
              4000
            );
          } catch (err) {
            console.error('Error cargando resultados:', err);
          }
        }
      )
      .subscribe();

    const roomCheckInterval = setInterval(async () => {
      try {
        const roomData = await impostorService.getRoom(roomCode);
        
        if (roomData.status === 'finished') {
          console.log('⚠️ Polling detectó sala cerrada');
          
          showNotification(
            'Sala Cerrada',
            'La sala ya no está disponible',
            'error',
            3000
          );
          
          clearInterval(roomCheckInterval);
          
          setTimeout(() => {
            navigate('/impostor');
          }, 2000);
        }
      } catch (error) {
        if (error.message?.includes('No rows') || error.code === 'PGRST116') {
          console.log('⚠️ Sala no encontrada, probablemente fue eliminada');
          
          showNotification(
            'Sala Cerrada',
            'La sala ya no existe',
            'error',
            3000
          );
          
          clearInterval(roomCheckInterval);
          
          setTimeout(() => {
            navigate('/impostor');
          }, 2000);
        }
      }
    }, 3000);

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
            '¡Nueva Ronda!',
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
      supabase.removeChannel(resultsSubscription);
      clearInterval(pollingInterval);
      clearInterval(roomCheckInterval);
    };
  }, [roomCode, gameStarted, roomPlayers, room, navigate]);

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
      
      // ✅ ARREGLADO: Obtener perfil ANTES de cargar la sala
      const { data: profile } = await supabase
        .from('perfil')
        .select('nombre, apellido, username')
        .eq('user_id', user.id)
        .maybeSingle();

      const username = profile?.nombre && profile?.apellido
        ? `${profile.nombre} ${profile.apellido}`
        : profile?.username || user.email?.split('@')[0] || 'Jugador';

      console.log('👤 Username obtenido:', username);

      await loadRoom();

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
      
      if (previousPlayerIdRef.current && 
          previousPlayerIdRef.current !== roomData.current_player_id &&
          gameStarted) {
        showNotification(
          '¡Cambio de Turno!',
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
        'Configuración Actualizada',
        `Número de impostores: ${numImpostors}`,
        'success',
        3000
      );
    } catch (err) {
      console.error('Error actualizando impostores:', err);
      setError('Error al actualizar impostores');
      setLoading(false);
      
      showNotification(
        'Error',
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
        '¡Ronda Iniciada!',
        'Los roles han sido asignados a todos los jugadores',
        'success',
        3000
      );
    } catch (err) {
      console.error('Error iniciando juego:', err);
      setError(err.message || 'Error al iniciar el juego');
      setLoading(false);
      
      showNotification(
        'Error',
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

  const showResults = async () => {
    try {
      const sessions = await impostorService.getRoomSessions(roomCode);
      const currentImpostors = sessions.filter(s => s.is_impostor);
      
      const impostorPlayersList = roomPlayers.filter(p => 
        currentImpostors.some(s => s.player_number === p.player_number)
      );
      
      setRoundResults({
        impostorPlayers: impostorPlayersList,
        selectedPlayer: room.footballers
      });
      
      setShowResultsModal(true);
      
      // ✅ ARREGLADO: Hacer broadcast para que TODOS vean los resultados
      const channel = supabase.channel(`room-${roomCode}-results-broadcast`);
      
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'show_results',
            payload: { 
              roomCode,
              timestamp: new Date().toISOString()
            }
          });
          console.log('📡 Broadcast enviado: show_results');
          
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        }
      });
      
    } catch (err) {
      console.error('Error obteniendo resultados:', err);
      showNotification('Error', 'No se pudieron cargar los resultados', 'error', 3000);
    }
  };

  const handleNewRound = async () => {
    setShowResultsModal(false);
    
    hasLoadedRole.current = false;
    setIsRevealed(false);
    setPlayerRole(null);
    
    await startGame();
  };

  const handleLeaveConfirm = () => {
    setShowLeaveConfirm(true);
  };

  const exitGame = async () => {
    try {
      if (isHost && currentUser) {
        console.log('👑 Host saliendo, cerrando sala para todos...');
        
        const channel = supabase.channel(`room-${roomCode}-closed-broadcast-exit`);
        
        await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'room_closed',
              payload: { 
                roomCode,
                reason: 'host_left',
                timestamp: new Date().toISOString()
              }
            });
            console.log('📡 Broadcast enviado: room_closed desde exitGame');
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await impostorService.endRoom(roomCode);
            await impostorService.leaveRoom(roomCode, currentUser.id);
            
            supabase.removeChannel(channel);
          }
        });
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

  const broadcastRoundResults = async (results) => {
    const channel = supabase.channel(`room-${roomCode}-results-broadcast`);

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'round_results',
          payload: results,
        });
        console.log('📡 Broadcast enviado: round_results');

        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 1000);
      }
    });
  };

  const handleEndRound = async () => {
    if (!isHost) return;

    const results = {
      impostorPlayers: roomPlayers.filter((p) => p.isImpostor),
      selectedPlayer: roomPlayers.find((p) => p.isSelected),
    };

    setRoundResults(results);
    setShowResultsModal(true);

    await broadcastRoundResults(results);
  };

  useEffect(() => {
    const resultsSubscription = supabase
      .channel(`room-${roomCode}-results-listener`)
      .on('broadcast', { event: 'round_results' }, (payload) => {
        console.log('📡 Broadcast recibido: round_results', payload);
        setRoundResults(payload);
        setShowResultsModal(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(resultsSubscription);
    };
  }, [roomCode]);

  return (
    <>
      <Header />
      
      <RoundResultsModal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        onNewRound={isHost ? handleNewRound : null}
        impostorPlayers={roundResults?.impostorPlayers}
        selectedPlayer={roundResults?.selectedPlayer}
      />
      
      {showLeaveConfirm && (
        <div className="leave-confirm-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="leave-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>¿Salir de la sala?</h3>
            <p>
              {isHost 
                ? '⚠️ Eres el host. Si sales, la sala se cerrará para todos.'
                : '¿Estás seguro de que quieres salir?'
              }
            </p>
            <div className="leave-confirm-buttons">
              <button onClick={exitGame} className="confirm-btn-yes">
                Sí, salir
              </button>
              <button onClick={() => setShowLeaveConfirm(false)} className="confirm-btn-no">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                  {isHost ? (
                    <button
                      onClick={showResults}
                      className="impostor-game-btn impostor-game-btn-primary"
                    >
                      📊 Mostrar Resultados a Todos
                    </button>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.85)',
                      fontSize: '1rem',
                      padding: '18px 25px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '15px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.05)',
                      flex: 1,
                      minWidth: '220px'
                    }}>
                      ⏳ Esperando a que el host revele los resultados...
                    </div>
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

        <button onClick={handleLeaveConfirm} className="impostor-game-btn-exit">
          ← Salir de la Sala
        </button>
      </div>
    </>
  );
};

export default ImpostorGame;