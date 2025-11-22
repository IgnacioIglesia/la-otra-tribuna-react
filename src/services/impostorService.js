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
        return { player: allPlayers[randomIndex], wasReset: true };
      }
      
      const randomIndex = Math.floor(Math.random() * data.length);
      return { player: data[randomIndex], wasReset: false };
    } catch (error) {
      console.error('Error fetching random player:', error);
      throw error;
    }
  }

  // 🔥 NUEVO: Obtener jugadores ya usados desde la columna de la sala
  async getUsedPlayers(roomCode) {
    try {
      const { data, error } = await supabase
        .from('impostor_rooms')
        .select('used_player_ids')
        .eq('room_code', roomCode)
        .single();

      if (error) throw error;
      
      return data?.used_player_ids || [];
    } catch (error) {
      console.error('Error fetching used players:', error);
      return [];
    }
  }

  // 🔥 NUEVO: Agregar un jugador a la lista de usados
  async addUsedPlayer(roomCode, playerId) {
    try {
      const currentUsed = await this.getUsedPlayers(roomCode);
      
      if (!currentUsed.includes(playerId)) {
        const updatedList = [...currentUsed, playerId];
        
        const { error } = await supabase
          .from('impostor_rooms')
          .update({ used_player_ids: updatedList })
          .eq('room_code', roomCode);

        if (error) throw error;
        console.log(`✅ Jugador ${playerId} agregado a usados. Total: ${updatedList.length}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error adding used player:', error);
      throw error;
    }
  }

  // 🔥 NUEVO: Resetear jugadores usados
  async resetUsedPlayers(roomCode) {
    try {
      const { error } = await supabase
        .from('impostor_rooms')
        .update({ used_player_ids: [] })
        .eq('room_code', roomCode);

      if (error) throw error;
      console.log('🔄 Jugadores usados reseteados');
      return true;
    } catch (error) {
      console.error('Error resetting used players:', error);
      throw error;
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
        status: 'waiting',
        used_player_ids: []
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

  // Actualizar número de impostores
  async updateRoomImpostors(roomCode, numImpostors) {
    try {
      const { error } = await supabase
        .from('impostor_rooms')
        .update({ num_impostors: numImpostors })
        .eq('room_code', roomCode);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating impostors:', error);
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
  
      // Verificar si el jugador ya existe
      const { data: existingPlayer } = await supabase
        .from('impostor_players')
        .select('*')
        .eq('room_code', roomCode)
        .eq('user_id', userId)
        .maybeSingle();
  
      if (existingPlayer) {
        return { 
          playerNumber: existingPlayer.player_number, 
          isWaiting: existingPlayer.is_waiting || false 
        };
      }

      // Obtener nombre completo del perfil
      const { data: profile } = await supabase
        .from('perfil')
        .select('nombre, apellido')
        .eq('user_id', userId)
        .maybeSingle();

      let displayUsername = username;
      if (profile?.nombre && profile?.apellido) {
        displayUsername = `${profile.nombre} ${profile.apellido}`;
      }

      console.log('👤 Nombre para mostrar:', displayUsername);
  
      // Calcular el próximo número de jugador para esta sala específica
      const { data: existingPlayers, error: playersError } = await supabase
        .from('impostor_players')
        .select('player_number')
        .eq('room_code', roomCode)
        .order('player_number', { ascending: true });
  
      if (playersError) throw playersError;
  
      // Encontrar el primer número disponible
      let nextPlayerNumber = 1;
      const occupiedNumbers = (existingPlayers || []).map(p => p.player_number);
      
      while (occupiedNumbers.includes(nextPlayerNumber)) {
        nextPlayerNumber++;
      }
  
      console.log('🎲 Próximo número de jugador:', nextPlayerNumber);
  
      // Si la sala ya está jugando, este jugador entra "en espera"
      const isWaiting = room.status === 'playing';
  
      // Insertar con player_number explícito y nombre completo
      const { data: newPlayer, error: insertError } = await supabase
        .from('impostor_players')
        .insert([
          {
            room_code: roomCode,
            user_id: userId,
            username: displayUsername,
            player_number: nextPlayerNumber,
            is_waiting: isWaiting,
          },
        ])
        .select()
        .single();
  
      if (insertError) {
        console.error('Error insertando jugador:', insertError);
        throw insertError;
      }
  
      return { 
        playerNumber: newPlayer.player_number, 
        isWaiting: newPlayer.is_waiting || false 
      };
    } catch (error) {
      console.error('Error al unirse a la sala:', error);
      throw error;
    }
  }

  // Obtener jugadores en la sala CON NOMBRES COMPLETOS
  async getRoomPlayers(roomCode) {
    try {
      const { data, error } = await supabase
        .from('impostor_players')
        .select(`
          *,
          usuario:user_id (
            nombre,
            apellido,
            email
          )
        `)
        .eq('room_code', roomCode)
        .order('player_number');

      if (error) throw error;

      // Formatear nombres completos
      const playersWithNames = (data || []).map((player) => {
        const u = player.usuario;
        let displayName = player.username;

        if (u?.nombre && u?.apellido) {
          displayName = `${u.nombre} ${u.apellido}`;
        } else if (u?.email) {
          displayName = u.email.split('@')[0];
        }

        return {
          ...player,
          username: displayName,
        };
      });

      return playersWithNames;
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

  // Iniciar ronda: asigna jugador y roles
  async startRound(roomCode, numPlayers, numImpostors) {
    try {
      console.log('🎮 Iniciando ronda...', { roomCode, numPlayers, numImpostors });
      
      const connectedPlayers = await this.getRoomPlayers(roomCode);
      const actualPlayerCount = connectedPlayers.length;
      
      console.log('👥 Jugadores conectados:', actualPlayerCount, 'de', numPlayers);
      
      const adjustedImpostors = Math.min(
        numImpostors,
        Math.max(1, Math.floor(actualPlayerCount / 2) - 1)
      );
      
      console.log(`🎭 Impostores ajustados: ${adjustedImpostors} (original: ${numImpostors})`);
      
      // 🔥 Obtener jugadores ya usados desde la sala
      const usedPlayers = await this.getUsedPlayers(roomCode);
      console.log('Jugadores ya usados:', usedPlayers);
      
      // 🔥 Obtener jugador aleatorio excluyendo los usados
      const result = await this.getRandomPlayerExcluding(usedPlayers);
      const selectedPlayer = result.player;
      
      // 🔥 Si se reseteó la lista, limpiar los usados en la DB
      if (result.wasReset) {
        console.log('🔄 Se agotaron los jugadores, reseteando lista...');
        await this.resetUsedPlayers(roomCode);
      }
      
      if (!selectedPlayer) {
        throw new Error('No hay jugadores disponibles en la base de datos');
      }

      console.log('Jugador seleccionado:', selectedPlayer.name);

      // 🔥 NUEVO: Registrar este jugador como usado
      await this.addUsedPlayer(roomCode, selectedPlayer.id);

      const { error: updateError } = await supabase
        .from('impostor_rooms')
        .update({ 
          current_player_id: selectedPlayer.id,
          status: 'playing'
        })
        .eq('room_code', roomCode);

      if (updateError) throw updateError;

      const playerNumbers = connectedPlayers.map(p => p.player_number).sort((a, b) => a - b);
      const roles = this.assignRolesToConnectedPlayers(playerNumbers, adjustedImpostors);

      console.log('🎭 Roles asignados:', roles);

      console.log('🗑️ Limpiando sesiones anteriores...');
      const { error: deleteError } = await supabase
        .from('impostor_sessions')
        .delete()
        .eq('room_code', roomCode);

      if (deleteError) {
        console.error('Error eliminando sesiones:', deleteError);
        throw deleteError;
      }

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

      const impostorNumbers = roles.filter(r => r.isImpostor).map(r => r.playerNumber);
      const impostorPlayers = connectedPlayers.filter(p => impostorNumbers.includes(p.player_number));

      await this.notifyGameStart(roomCode);

      return {
        selectedPlayer,
        roles,
        roomCode,
        adjustedImpostors,
        impostorPlayers
      };
    } catch (error) {
      console.error('Error starting round:', error);
      throw error;
    }
  }

  assignRolesToConnectedPlayers(playerNumbers, numImpostors) {
    const roles = playerNumbers.map(num => ({ playerNumber: num, isImpostor: false }));
    const impostorIndices = [];
    
    while (impostorIndices.length < numImpostors) {
      const randomIndex = Math.floor(Math.random() * roles.length);
      if (!impostorIndices.includes(randomIndex)) {
        impostorIndices.push(randomIndex);
        roles[randomIndex].isImpostor = true;
      }
    }
    
    console.log(
      `✅ ${numImpostors} impostor(es) asignado(s) en posiciones:`,
      impostorIndices.map(i => playerNumbers[i])
    );
    
    return roles;
  }

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

  // Actualiza la sala a estado "results" para forzar sincronización
  async broadcastResults(roomCode) {
    try {
      console.log('📊 Enviando broadcast de resultados a todos...');
      
      // Actualizar el estado de la sala en la DB para trigger
      const { error: updateError } = await supabase
        .from('impostor_rooms')
        .update({ 
          status: 'showing_results'
        })
        .eq('room_code', roomCode);

      if (updateError) {
        console.error('❌ Error actualizando sala:', updateError);
      }
      
      // 🔥 IMPORTANTE: Usar el mismo nombre de canal que en el listener
      const channel = supabase.channel(`room-${roomCode}-results-listener`);
      
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal suscrito, enviando broadcast...');
          
          const result = await channel.send({
            type: 'broadcast',
            event: 'show_results',
            payload: { 
              roomCode,
              timestamp: new Date().toISOString()
            }
          });
          
          console.log('📡 Resultado del broadcast:', result);
          
          setTimeout(() => {
            console.log('🔌 Cerrando canal después de broadcast');
            supabase.removeChannel(channel);
          }, 2000);
        } else {
          console.error('❌ Error al suscribirse al canal:', status);
        }
      });
    } catch (error) {
      console.error('❌ Error enviando broadcast de resultados:', error);
      throw error;
    }
  }

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

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

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