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
        .select('*');

      if (usedPlayerIds.length > 0) {
        query = query.not('id', 'in', `(${usedPlayerIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('No hay más jugadores disponibles, reseteando...');
        const { data: allPlayers, error: allError } = await supabase
          .from('footballers')
          .select('*');
        
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

  // ✅ NUEVO: Unirse a sala y obtener número de jugador automáticamente
  async joinRoom(roomCode, userId, username) {
    try {
      // 1. Verificar que la sala existe y obtener info
      const { data: room, error: roomError } = await supabase
        .from('impostor_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError) throw new Error('Sala no encontrada');
      if (room.status === 'finished') throw new Error('Esta sala ya finalizó');

      // 2. Verificar si el usuario ya está en la sala
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

      // 3. Obtener jugadores actuales en la sala
      const { data: currentPlayers, error: playersError } = await supabase
        .from('impostor_players')
        .select('player_number')
        .eq('room_code', roomCode)
        .order('player_number');

      if (playersError) throw playersError;

      // 4. Encontrar el primer número disponible
      let playerNumber = 1;
      const usedNumbers = currentPlayers ? currentPlayers.map(p => p.player_number) : [];
      
      while (usedNumbers.includes(playerNumber) && playerNumber <= room.num_players) {
        playerNumber++;
      }

      if (playerNumber > room.num_players) {
        throw new Error('La sala está llena');
      }

      // 5. Insertar el jugador en la sala
      const { error: insertError } = await supabase
        .from('impostor_players')
        .insert({
          room_code: roomCode,
          user_id: userId,
          username: username,
          player_number: playerNumber
        });

      if (insertError) {
        // Si hay error de duplicado, intentar obtener el número existente
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

  // ✅ NUEVO: Obtener jugadores en la sala
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

  // Iniciar ronda con soporte para múltiples impostores
  async startRound(roomCode, numPlayers, numImpostors) {
    try {
      // 1. Obtener jugadores ya usados en esta sala
      const usedPlayers = await this.getUsedPlayers(roomCode);
      console.log('Jugadores ya usados:', usedPlayers);
      
      // 2. Obtener jugador aleatorio que NO haya sido usado
      const selectedPlayer = await this.getRandomPlayerExcluding(usedPlayers);
      
      if (!selectedPlayer) {
        throw new Error('No hay jugadores disponibles en la base de datos');
      }

      console.log('Jugador seleccionado:', selectedPlayer.name);

      // 3. Actualizar sala con jugador seleccionado
      const { error: updateError } = await supabase
        .from('impostor_rooms')
        .update({ 
          current_player_id: selectedPlayer.id,
          status: 'playing'
        })
        .eq('room_code', roomCode);

      if (updateError) throw updateError;

      // 4. Generar array de roles (quiénes son impostores)
      const roles = this.assignRoles(numPlayers, numImpostors);

      // 5. Limpiar sesiones anteriores de esta ronda
      const { data: existingSessions } = await supabase
        .from('impostor_sessions')
        .select('*')
        .eq('room_code', roomCode)
        .eq('player_id', selectedPlayer.id);

      if (existingSessions && existingSessions.length > 0) {
        await supabase
          .from('impostor_sessions')
          .delete()
          .eq('room_code', roomCode)
          .eq('player_id', selectedPlayer.id);
      }

      // 6. Crear nuevas sesiones para cada jugador
      const sessions = roles.map((isImpostor, index) => ({
        room_code: roomCode,
        player_number: index + 1,
        is_impostor: isImpostor,
        player_id: selectedPlayer.id
      }));

      const { error: insertError } = await supabase
        .from('impostor_sessions')
        .insert(sessions);

      if (insertError) {
        console.error('Error insertando sesiones:', insertError);
        throw insertError;
      }

      return {
        selectedPlayer,
        roles,
        roomCode
      };
    } catch (error) {
      console.error('Error starting round:', error);
      throw error;
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

  // ✅ NUEVO: Suscribirse a cambios en la sala
  subscribeToRoomPlayers(roomCode, callback) {
    const subscription = supabase
      .channel(`room_${roomCode}_players`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'impostor_players',
          filter: `room_code=eq.${roomCode}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  // ✅ NUEVO: Suscribirse a cambios en el estado de la sala
  subscribeToRoomStatus(roomCode, callback) {
    const subscription = supabase
      .channel(`room_${roomCode}_status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'impostor_rooms',
          filter: `room_code=eq.${roomCode}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  // ✅ NUEVO: Salir de una sala (eliminar jugador)
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

  // Helpers
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ✅ CORREGIDO: Ahora soporta múltiples impostores correctamente
  assignRoles(numPlayers, numImpostors) {
    // Crear array con todos false (jugadores normales)
    const roles = Array(numPlayers).fill(false);
    
    // Seleccionar posiciones aleatorias para impostores
    const impostorPositions = [];
    while (impostorPositions.length < numImpostors) {
      const randomPos = Math.floor(Math.random() * numPlayers);
      if (!impostorPositions.includes(randomPos)) {
        impostorPositions.push(randomPos);
        roles[randomPos] = true;
      }
    }
    
    console.log(`Asignados ${numImpostors} impostores en posiciones:`, impostorPositions);
    return roles;
  }
}

export default new ImpostorService();