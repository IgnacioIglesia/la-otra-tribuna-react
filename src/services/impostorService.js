import { supabase } from '../lib/supabaseClient';

class ImpostorService {
  // Obtener todos los jugadores activos
  async getAllPlayers() {
    try {
      const { data, error } = await supabase
        .from('footballers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching players:', error);
      throw error;
    }
  }

  // Obtener jugador aleatorio excluyendo los ya usados
  async getRandomPlayerExcluding(usedPlayerIds = []) {
    try {
      let query = supabase
        .from('footballers')
        .select('*')
        .eq('is_active', true);

      if (usedPlayerIds.length > 0) {
        query = query.not('id', 'in', `(${usedPlayerIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('No hay más jugadores disponibles, reseteando...');
        const { data: allPlayers, error: allError } = await supabase
          .from('footballers')
          .select('*')
          .eq('is_active', true);
        
        if (allError) throw allError;
        if (!allPlayers || allPlayers.length === 0) {
          throw new Error('No hay jugadores disponibles en la base de datos');
        }
        
        const randomIndex = Math.floor(Math.random() * allPlayers.length);
        return allPlayers[randomIndex];
      }
      
      const randomIndex = Math.floor(Math.random() * data.length);
      return data[randomIndex];
    } catch (error) {
      console.error('Error fetching random player:', error);
      throw error;
    }
  }

  // Obtener jugadores ya usados en esta sala
  async getUsedPlayers(roomCode) {
    try {
      const { data, error } = await supabase
        .from('impostor_sessions')
        .select('player_id')
        .eq('room_code', roomCode);

      if (error) throw error;
      
      return data ? [...new Set(data.map(session => session.player_id))].filter(Boolean) : [];
    } catch (error) {
      console.error('Error fetching used players:', error);
      return [];
    }
  }

  // Crear sala de juego
  async createRoom(numPlayers, numImpostors, hostUserId = null) {
    try {
      const roomCode = this.generateRoomCode();
      
      const roomData = {
        room_code: roomCode,
        num_players: numPlayers,
        num_impostors: numImpostors,
        status: 'waiting'
      };

      if (hostUserId) {
        roomData.host_user_id = hostUserId;
      }

      console.log('Creando sala con datos:', roomData);

      const { data, error } = await supabase
        .from('impostor_rooms')
        .insert([roomData])
        .select()
        .single();

      if (error) {
        console.error('Error detallado de Supabase:', error);
        if (error.code === '23505') {
          throw new Error('Ya existe una sala con ese código. Intenta de nuevo.');
        } else if (error.code === '23502') {
          throw new Error('Faltan datos requeridos para crear la sala.');
        } else if (error.message.includes('invalid input syntax')) {
          throw new Error('Error en el formato de datos. Verifica tu sesión.');
        } else {
          throw new Error(error.message || 'Error al crear la sala');
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // Unirse a sala y obtener número de jugador automáticamente
  async joinRoom(roomCode, userId, username) {
    try {
      const { data: room, error: roomError } = await supabase
        .from('impostor_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError) throw new Error('Sala no encontrada');
      if (room.status === 'finished') throw new Error('Esta sala ya finalizó');

      const { data: existingPlayer } = await supabase
        .from('impostor_players')
        .select('player_number')
        .eq('room_code', roomCode)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingPlayer) {
        console.log('Usuario ya está en la sala, usando número:', existingPlayer.player_number);
        return {
          playerNumber: existingPlayer.player_number,
          isNew: false
        };
      }

      const { data: currentPlayers, error: playersError } = await supabase
        .from('impostor_players')
        .select('player_number')
        .eq('room_code', roomCode)
        .order('player_number');

      if (playersError) throw playersError;

      let playerNumber = 1;
      const usedNumbers = currentPlayers ? currentPlayers.map(p => p.player_number) : [];
      
      while (usedNumbers.includes(playerNumber) && playerNumber <= room.num_players) {
        playerNumber++;
      }

      if (playerNumber > room.num_players) {
        throw new Error('La sala está llena');
      }

      const { error: insertError } = await supabase
        .from('impostor_players')
        .insert({
          room_code: roomCode,
          user_id: userId,
          username: username,
          player_number: playerNumber
        });

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: retryPlayer } = await supabase
            .from('impostor_players')
            .select('player_number')
            .eq('room_code', roomCode)
            .eq('user_id', userId)
            .maybeSingle();
          
          if (retryPlayer) {
            return {
              playerNumber: retryPlayer.player_number,
              isNew: false
            };
          }
        }
        throw insertError;
      }

      console.log('Usuario asignado al número:', playerNumber);
      return {
        playerNumber,
        isNew: true
      };
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  // Obtener jugadores en la sala
  async getRoomPlayers(roomCode) {
    try {
      const { data, error } = await supabase
        .from('impostor_players')
        .select('*')
        .eq('room_code', roomCode)
        .order('player_number');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching room players:', error);
      throw error;
    }
  }

  // Obtener información de sala
  async getRoom(roomCode) {
    try {
      const { data, error } = await supabase
        .from('impostor_rooms')
        .select('*, footballers(*)')
        .eq('room_code', roomCode)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching room:', error);
      throw error;
    }
  }

  // ✅ ARREGLADO: Garantiza que siempre haya el número correcto de impostores
  async startRound(roomCode, numPlayers, numImpostors) {
    try {
      console.log('🎮 Iniciando ronda...', { roomCode, numPlayers, numImpostors });
      
      // 1. Obtener jugadores REALMENTE conectados en la sala
      const connectedPlayers = await this.getRoomPlayers(roomCode);
      const actualPlayerCount = connectedPlayers.length;
      
      console.log('👥 Jugadores conectados:', actualPlayerCount, 'de', numPlayers);
      
      // 2. ✅ AJUSTAR número de impostores si hay menos jugadores que el máximo
      const adjustedImpostors = Math.min(numImpostors, Math.max(1, Math.floor(actualPlayerCount / 2) - 1));
      
      console.log(`🎭 Impostores ajustados: ${adjustedImpostors} (original: ${numImpostors})`);
      
      // 3. Obtener jugadores ya usados
      const usedPlayers = await this.getUsedPlayers(roomCode);
      console.log('Jugadores ya usados:', usedPlayers);
      
      // 4. Obtener jugador aleatorio
      const selectedPlayer = await this.getRandomPlayerExcluding(usedPlayers);
      
      if (!selectedPlayer) {
        throw new Error('No hay jugadores disponibles en la base de datos');
      }

      console.log('Jugador seleccionado:', selectedPlayer.name);

      // 5. Actualizar sala
      const { error: updateError } = await supabase
        .from('impostor_rooms')
        .update({ 
          current_player_id: selectedPlayer.id,
          status: 'playing'
        })
        .eq('room_code', roomCode);

      if (updateError) throw updateError;

      // 6. ✅ Asignar roles basándose en jugadores REALES conectados
      const playerNumbers = connectedPlayers.map(p => p.player_number).sort((a, b) => a - b);
      const roles = this.assignRolesToConnectedPlayers(playerNumbers, adjustedImpostors);

      console.log('🎭 Roles asignados:', roles);

      // 7. Eliminar sesiones anteriores
      console.log('🗑️ Limpiando sesiones anteriores...');
      const { error: deleteError } = await supabase
        .from('impostor_sessions')
        .delete()
        .eq('room_code', roomCode);

      if (deleteError) {
        console.error('Error eliminando sesiones:', deleteError);
        throw deleteError;
      }

      // 8. ✅ Crear sesiones SOLO para jugadores conectados
      const sessions = roles.map(({ playerNumber, isImpostor }) => ({
        room_code: roomCode,
        player_number: playerNumber,
        is_impostor: isImpostor,
        player_id: selectedPlayer.id
      }));

      console.log('📝 Insertando nuevas sesiones:', sessions);

      const { error: insertError } = await supabase
        .from('impostor_sessions')
        .insert(sessions);

      if (insertError) {
        console.error('Error insertando sesiones:', insertError);
        throw insertError;
      }

      console.log('✅ Sesiones creadas correctamente');

      // 9. Notificar a todos los clientes
      await this.notifyGameStart(roomCode);

      return {
        selectedPlayer,
        roles,
        roomCode,
        adjustedImpostors
      };
    } catch (error) {
      console.error('Error starting round:', error);
      throw error;
    }
  }

  // ✅ NUEVO: Asignar roles a jugadores realmente conectados
  assignRolesToConnectedPlayers(playerNumbers, numImpostors) {
    const roles = playerNumbers.map(num => ({ playerNumber: num, isImpostor: false }));
    const impostorIndices = [];
    
    // Seleccionar índices aleatorios para impostores
    while (impostorIndices.length < numImpostors) {
      const randomIndex = Math.floor(Math.random() * roles.length);
      if (!impostorIndices.includes(randomIndex)) {
        impostorIndices.push(randomIndex);
        roles[randomIndex].isImpostor = true;
      }
    }
    
    console.log(`✅ ${numImpostors} impostor(es) asignado(s) en posiciones:`, 
      impostorIndices.map(i => playerNumbers[i]));
    
    return roles;
  }

  // Notificar inicio de juego via broadcast
  async notifyGameStart(roomCode) {
    try {
      const channel = supabase.channel(`room-${roomCode}-broadcast`);
      
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'game_started',
            payload: { 
              roomCode, 
              timestamp: new Date().toISOString() 
            }
          });
          console.log('📡 Broadcast enviado: game_started');
          
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        }
      });
    } catch (error) {
      console.error('Error enviando broadcast:', error);
    }
  }

  // Obtener rol de jugador específico
  async getPlayerRole(roomCode, playerNumber) {
    try {
      const { data, error } = await supabase
        .from('impostor_sessions')
        .select('*, footballers(*)')
        .eq('room_code', roomCode)
        .eq('player_number', playerNumber)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No se encontró tu rol');
      return data;
    } catch (error) {
      console.error('Error fetching player role:', error);
      throw error;
    }
  }

  // Obtener todas las sesiones de una sala
  async getRoomSessions(roomCode) {
    try {
      const { data, error } = await supabase
        .from('impostor_sessions')
        .select('*')
        .eq('room_code', roomCode)
        .order('player_number');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching room sessions:', error);
      throw error;
    }
  }

  // Finalizar sala
  async endRoom(roomCode) {
    try {
      const { error } = await supabase
        .from('impostor_rooms')
        .update({ status: 'finished' })
        .eq('room_code', roomCode);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error ending room:', error);
      throw error;
    }
  }

  // Suscribirse a cambios en jugadores
  subscribeToRoomPlayers(roomCode, callback) {
    const channel = supabase
      .channel(`room-${roomCode}-players`, {
        config: {
          broadcast: { self: true, ack: true },
          presence: { key: roomCode }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'impostor_players',
          filter: `room_code=eq.${roomCode}`
        },
        (payload) => {
          console.log('👥 Cambio en jugadores:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito a cambios de jugadores');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en suscripción de jugadores');
        }
      });

    return channel;
  }

  // Suscribirse a cambios en el estado de la sala + broadcast
  subscribeToRoomStatus(roomCode, callback) {
    const channel = supabase
      .channel(`room-${roomCode}-status`, {
        config: {
          broadcast: { self: true, ack: true },
          presence: { key: roomCode }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'impostor_rooms',
          filter: `room_code=eq.${roomCode}`
        },
        (payload) => {
          console.log('🏠 Cambio en sala (DB):', payload);
          callback({ type: 'db_change', ...payload });
        }
      )
      .on(
        'broadcast',
        { event: 'game_started' },
        (payload) => {
          console.log('📡 Broadcast recibido:', payload);
          callback({ type: 'broadcast', event: 'game_started', ...payload });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito a estado de sala');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en suscripción de sala');
        }
      });

    return channel;
  }

  // Salir de una sala
  async leaveRoom(roomCode, userId) {
    try {
      const { error } = await supabase
        .from('impostor_players')
        .delete()
        .eq('room_code', roomCode)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }

  // Generar código de sala
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // DEPRECADO: Ya no se usa
  assignRoles(numPlayers, numImpostors) {
    const roles = Array(numPlayers).fill(false);
    const impostorPositions = [];
    
    while (impostorPositions.length < numImpostors) {
      const randomPos = Math.floor(Math.random() * numPlayers);
      if (!impostorPositions.includes(randomPos)) {
        impostorPositions.push(randomPos);
        roles[randomPos] = true;
      }
    }
    
    return roles;
  }
}

export default new ImpostorService();