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

      // Si hay jugadores usados, excluirlos
      if (usedPlayerIds.length > 0) {
        query = query.not('id', 'in', `(${usedPlayerIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Si no quedan jugadores disponibles, resetear y usar todos
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
      
      // Seleccionar jugador aleatorio de los disponibles
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
      
      // Retornar array de IDs únicos
      return data ? [...new Set(data.map(session => session.player_id))].filter(Boolean) : [];
    } catch (error) {
      console.error('Error fetching used players:', error);
      return [];
    }
  }

  // Crear sala de juego
  async createRoom(numPlayers, numImpostors, hostUserId = null) {
    try {
      // Generar código único de 6 caracteres
      const roomCode = this.generateRoomCode();
      
      // Preparar el objeto para insertar
      const roomData = {
        room_code: roomCode,
        num_players: numPlayers,
        num_impostors: numImpostors,
        status: 'waiting'
      };

      // Solo agregar host_user_id si existe y no es null
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
        // Hacer el mensaje de error más amigable
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

  // Iniciar ronda (asignar jugador e impostores) con restricción de no repetir
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

      // 5. Limpiar sesiones anteriores de esta ronda (no de la sala completa)
      // Solo eliminamos si vamos a crear nuevas sesiones para la misma ronda
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

      // 6. Crear nuevas sesiones
      const sessions = roles.map((isImpostor, index) => ({
        room_code: roomCode,
        player_number: index + 1,
        is_impostor: isImpostor,
        player_id: selectedPlayer.id
      }));

      const { error: insertError } = await supabase
        .from('impostor_sessions')
        .insert(sessions);

      if (insertError) throw insertError;

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
      // Obtener la sesión más reciente para este jugador
      const { data, error } = await supabase
        .from('impostor_sessions')
        .select('*, footballers(*)')
        .eq('room_code', roomCode)
        .eq('player_number', playerNumber)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
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

  // Helpers
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

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
    
    return roles;
  }
}

export default new ImpostorService();