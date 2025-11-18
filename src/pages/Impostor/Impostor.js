import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import impostorService from '../../services/impostorService';
import Header from '../../components/Header/Header';
import './Impostor.css';

const Impostor = () => {
  const navigate = useNavigate();
  const [numPlayers, setNumPlayers] = useState(5);
  const [numImpostors, setNumImpostors] = useState(1);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ CORREGIDO: Cálculo correcto del máximo de impostores
  // Para 3 jugadores: max 1 impostor
  // Para 4 jugadores: max 1 impostor  
  // Para 5 jugadores: max 2 impostores
  // Para 6+ jugadores: max Math.floor(jugadores/2) - 1, hasta un máximo de 4
  const maxImpostors = Math.min(4, Math.max(1, Math.floor(numPlayers / 2) - 1));

  useEffect(() => {
    checkUser();
  }, []);

  // Ajustar numImpostors si excede el nuevo máximo
  useEffect(() => {
    if (numImpostors > maxImpostors) {
      setNumImpostors(maxImpostors);
    }
  }, [numPlayers, maxImpostors, numImpostors]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleCreateRoom = async () => {
    if (!user) {
      setError('Debes iniciar sesión para crear una sala');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Validación: mínimo 3 jugadores
      if (numPlayers < 3) {
        setError('Se necesitan al menos 3 jugadores');
        setLoading(false);
        return;
      }

      // Validación: impostores no pueden ser >= que jugadores
      if (numImpostors >= numPlayers) {
        setError('El número de impostores debe ser menor al de jugadores');
        setLoading(false);
        return;
      }

      const userId = user?.id || null;
      const room = await impostorService.createRoom(numPlayers, numImpostors, userId);
      
      navigate(`/impostor/sala/${room.room_code}`, {
        state: { isHost: true }
      });
    } catch (err) {
      console.error('Error completo:', err);
      setError(err.message || 'Error al crear la sala. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!user) {
      setError('Debes iniciar sesión para unirte a una sala');
      return;
    }

    if (roomCode.trim().length === 6) {
      navigate(`/impostor/sala/${roomCode.toUpperCase()}`);
    } else {
      setError('El código debe tener 6 caracteres');
    }
  };

  return (
    <>
      <Header />
      
      <div className="impostor-page">
        <div className="impostor-hero">
          <h1 className="impostor-main-title">
            🎭 IMPOSTOR FÚTBOL
          </h1>
          <p className="impostor-subtitle">
            ¿Quién es el impostor? Descúbrelo en este juego de deducción
          </p>
        </div>

        <div className="impostor-content">
          {!user && (
            <div className="impostor-section">
              <div className="impostor-error">
                🔒 Debes iniciar sesión para jugar
              </div>
            </div>
          )}

          {/* Crear Sala */}
          <div className="impostor-section">
            <h2 className="section-title">⚽ Crear Nueva Sala</h2>
            
            <div className="form-group">
              <label htmlFor="numPlayers">
                Número de Jugadores: <strong>{numPlayers}</strong>
              </label>
              <input
                type="range"
                id="numPlayers"
                min="3"
                max="20"
                value={numPlayers}
                onChange={(e) => setNumPlayers(parseInt(e.target.value))}
                className="impostor-slider"
                disabled={!user}
              />
              <div className="range-labels">
                <span>3</span>
                <span>20</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="numImpostors">
                Número de Impostores: <strong>{numImpostors}</strong>
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 'normal', 
                  marginLeft: '10px',
                  opacity: 0.8 
                }}>
                  (máx: {maxImpostors})
                </span>
              </label>
              <input
                type="range"
                id="numImpostors"
                min="1"
                max={maxImpostors}
                value={numImpostors}
                onChange={(e) => setNumImpostors(parseInt(e.target.value))}
                className="impostor-slider"
                disabled={!user}
              />
              <div className="range-labels">
                <span>1</span>
                <span>{maxImpostors}</span>
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={loading || !user}
              className="impostor-btn impostor-btn-primary"
            >
              {loading ? '⏳ Creando...' : '🎮 Crear Sala'}
            </button>
          </div>

          {/* Unirse a Sala */}
          <div className="impostor-section">
            <h2 className="section-title">🔗 Unirse a Sala Existente</h2>
            
            <div className="form-group">
              <label htmlFor="roomCode">Código de Sala (6 caracteres)</label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength="6"
                className="impostor-input"
                disabled={!user}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={roomCode.length !== 6 || !user}
              className="impostor-btn impostor-btn-secondary"
            >
              🚀 Unirse a Sala
            </button>
          </div>

          {error && (
            <div className="impostor-error">
              ⚠️ {error}
            </div>
          )}

          {/* Reglas */}
          <div className="impostor-section rules-section">
            <button
              onClick={() => setShowRules(!showRules)}
              className="impostor-btn impostor-btn-rules"
            >
              {showRules ? '▼' : '▶'} ¿Cómo se juega?
            </button>

            {showRules && (
              <div className="rules-content">
                <h3>📖 Reglas del Juego</h3>
                <ol className="rules-list">
                  <li>
                    <strong>Crea una sala</strong> y comparte el código con tus amigos
                  </li>
                  <li>
                    Se necesitan <strong>mínimo 3 jugadores</strong> para iniciar
                  </li>
                  <li>
                    Todos deben estar <strong>físicamente juntos</strong> (mismo lugar)
                  </li>
                  <li>
                    Al iniciar la ronda, cada uno verá en su celular:
                    <ul>
                      <li>🎭 <strong>"ERES EL IMPOSTOR"</strong> (si eres impostor)</li>
                      <li>⚽ <strong>Nombre + foto del jugador</strong> (si no lo eres)</li>
                    </ul>
                  </li>
                  <li>
                    Por turnos, cada uno dice <strong>una palabra o pista</strong> sobre "su" jugador
                  </li>
                  <li>
                    El impostor debe <strong>fingir que conoce</strong> al jugador sin ser descubierto
                  </li>
                  <li>
                    Al final, <strong>votan</strong> (hablando) quién creen que es el impostor
                  </li>
                  <li>
                    Si aciertan, ganan los jugadores. Si no, gana el impostor 🎭
                  </li>
                </ol>
                
                <div className="tips">
                  <h4>💡 Consejos</h4>
                  <ul>
                    <li>No seas demasiado obvio con tus pistas</li>
                    <li>El impostor debe escuchar atentamente para deducir quién es el jugador</li>
                    <li>Con más jugadores, puedes aumentar el número de impostores</li>
                    <li>¡Diviértanse y jueguen limpio! 🎉</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Impostor;