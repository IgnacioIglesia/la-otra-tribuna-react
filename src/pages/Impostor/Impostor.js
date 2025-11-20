import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import impostorService from '../../services/impostorService';
import Header from '../../components/Header/Header';
import './Impostor.css';

const Impostor = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

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

      const userId = user?.id || null;
      // Crear sala con valores por defecto: 5 jugadores, 1 impostor
      const room = await impostorService.createRoom(5, 1, userId);
      
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

  const handleRoomCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setRoomCode(value);
      setError('');
    }
  };

  return (
    <>
      <Header />
      
      <div className="impostor-page">
        <div className="impostor-hero">
          <div className="hero-icon">🎭</div>
          <h1 className="impostor-main-title">IMPOSTOR FÚTBOL</h1>
          <p className="impostor-subtitle">
            ¿Quién es el impostor? Descúbrelo en este juego de deducción
          </p>
        </div>

        <div className="impostor-content">
          {!user && (
            <div className="impostor-auth-warning">
              <div className="auth-warning-icon">🔒</div>
              <h3>Inicia sesión para jugar</h3>
              <p>Necesitas una cuenta para crear o unirte a salas</p>
            </div>
          )}

          <div className="impostor-main-grid">
            {/* Crear Sala */}
            <div className="impostor-card create-room-card">
              <div className="card-icon">⚽</div>
              <h2>Crear Nueva Sala</h2>
              <p className="card-description">
                Inicia una nueva partida y comparte el código con tus amigos
              </p>
              
              <button
                onClick={handleCreateRoom}
                disabled={loading || !user}
                className="impostor-action-btn primary-btn"
              >
                {loading ? (
                  <>
                    <span className="btn-spinner">⏳</span>
                    Creando sala...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🎮</span>
                    Crear Sala
                  </>
                )}
              </button>

              <div className="card-footer">
                <span className="info-badge">🎭 1 impostor por defecto</span>
                <span className="info-badge">👥 Sin límite de jugadores</span>
              </div>
            </div>

            {/* Unirse a Sala */}
            <div className="impostor-card join-room-card">
              <div className="card-icon">🔗</div>
              <h2>Unirse a Sala</h2>
              <p className="card-description">
                Ingresa el código de 6 caracteres que te compartió el host
              </p>
              
              <div className="join-room-input-container">
                <input
                  type="text"
                  value={roomCode}
                  onChange={handleRoomCodeChange}
                  placeholder="ABC123"
                  maxLength="6"
                  className="room-code-input"
                  disabled={!user}
                />

                <div className="input-hint">
                  {roomCode.length > 0 && roomCode.length < 6 && (
                    <span className="hint-warning">
                      ⚠️ Faltan {6 - roomCode.length} caracteres
                    </span>
                  )}
                  {roomCode.length === 6 && (
                    <span className="hint-success">✓ Código completo</span>
                  )}
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={roomCode.length !== 6 || !user || loading}
                  className="impostor-action-btn primary-btn"
                >
                  <span className="btn-icon">🚀</span>
                  Unirse
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="impostor-error-banner">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Reglas del Juego */}
          <div className="impostor-rules-card">
            <button
              onClick={() => setShowRules(!showRules)}
              className="rules-toggle-btn"
            >
              <span className="rules-icon">{showRules ? '📖' : '📚'}</span>
              <span className="rules-title">¿Cómo se juega?</span>
              <span className="toggle-arrow">{showRules ? '▼' : '▶'}</span>
            </button>

            {showRules && (
              <div className="rules-content-expanded">
                <div className="rules-grid">
                  <div className="rule-item">
                    <div className="rule-number">1</div>
                    <div className="rule-text">
                      <h4>Crea o únete a una sala</h4>
                      <p>El host crea la sala y comparte el código con los demás</p>
                    </div>
                  </div>

                  <div className="rule-item">
                    <div className="rule-number">2</div>
                    <div className="rule-text">
                      <h4>Mínimo 3 jugadores</h4>
                      <p>Todos deben estar físicamente juntos en el mismo lugar</p>
                    </div>
                  </div>

                  <div className="rule-item">
                    <div className="rule-number">3</div>
                    <div className="rule-text">
                      <h4>Recibe tu rol</h4>
                      <p>Cada jugador verá en su celular si es impostor o qué futbolista le tocó</p>
                    </div>
                  </div>

                  <div className="rule-item">
                    <div className="rule-number">4</div>
                    <div className="rule-text">
                      <h4>Da pistas por turnos</h4>
                      <p>Cada uno dice una palabra sobre "su" jugador. El impostor debe fingir</p>
                    </div>
                  </div>

                  <div className="rule-item">
                    <div className="rule-number">5</div>
                    <div className="rule-text">
                      <h4>Voten al impostor</h4>
                      <p>Al final, discutan y voten quién creen que es el impostor</p>
                    </div>
                  </div>

                  <div className="rule-item">
                    <div className="rule-number">6</div>
                    <div className="rule-text">
                      <h4>¡Gana el mejor!</h4>
                      <p>Si aciertan, ganan los jugadores. Si no, gana el impostor 🎭</p>
                    </div>
                  </div>
                </div>

                <div className="tips-section">
                  <h3>💡 Consejos Pro</h3>
                  <ul className="tips-list">
                    <li>No seas demasiado obvio con tus pistas</li>
                    <li>El impostor debe escuchar atentamente para deducir</li>
                    <li>El host puede ajustar los impostores en la sala de espera</li>
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