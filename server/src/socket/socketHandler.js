import geminiService from '../services/gemini/GeminiService.js';

const users = new Map();
const rooms = new Map();
const clientDashboards = new Set(); // Track client dashboard connections

// Broadcast visitor updates to all client dashboards
function broadcastVisitorUpdates(io) {
  const visitors = Array.from(users.entries())
    .filter(([_, user]) => user.role !== 'client')
    .map(([socketId, user]) => ({
      socketId,
      odId: user.odId,
      userName: user.userName,
      role: user.role,
      spatial: user.spatialData,
      joinedAt: user.joinedAt,
      roomId: user.roomId,
    }));

  clientDashboards.forEach(clientId => {
    io.to(clientId).emit('visitors-update', visitors);
  });
}

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // ==================== SESSION INITIALIZATION ====================
    
    socket.on('initialize-session', async ({ spaceConfig }) => {
      try {
        const result = await geminiService.initializeSession(socket.id, spaceConfig);
        socket.emit('session-initialized', result);
        console.log('📝 Session initialized for:', socket.id);
      } catch (error) {
        socket.emit('session-error', { error: error.message });
      }
    });

    // ==================== CLIENT DASHBOARD ====================
    
    socket.on('join-as-client', ({ role }) => {
      clientDashboards.add(socket.id);
      console.log('📊 Client dashboard connected:', socket.id);
      // Send current visitors immediately
      broadcastVisitorUpdates(io);
    });

    // ==================== TOUR ROOM MANAGEMENT ====================
    
    socket.on('join-tour', ({ tourId, userId, userName, role }) => {
      const roomId = `tour-${tourId}`;
      socket.join(roomId);
      
      users.set(socket.id, {
        odId: userId,
        userName: userName || `Guest-${socket.id.slice(-4)}`,
        role,
        roomId,
        spatialData: null,
        joinedAt: Date.now(),
      });
      
      // Notify client dashboards
      broadcastVisitorUpdates(io);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          tourId,
          participants: new Map(),
          chatHistory: [],
        });
      }

      const room = rooms.get(roomId);
      const user = users.get(socket.id);
      room.participants.set(socket.id, { odId: user.odId, userName: user.userName, role });

      // Notify others
      socket.to(roomId).emit('user-joined', {
        odId: user.odId,
        userName: user.userName,
        role,
        socketId: socket.id,
      });

      // Send room state to new user
      socket.emit('room-state', {
        participants: Array.from(room.participants.entries()).map(([sid, data]) => ({
          socketId: sid,
          ...data,
        })),
      });

      console.log(`👤 ${user.userName} joined tour ${tourId}`);
    });

    // ==================== SPATIAL TRACKING ====================
    
    socket.on('spatial-update', (spatialData) => {
      const user = users.get(socket.id);
      if (user) {
        user.spatialData = spatialData;
        socket.to(user.roomId).emit('participant-moved', {
          socketId: socket.id,
          spatialData,
        });
        
        // Notify client dashboards of spatial update
        clientDashboards.forEach(clientId => {
          io.to(clientId).emit('visitor-spatial-update', {
            odId: user.odId,
            socketId: socket.id,
            spatialData,
          });
        });
      }
    });

    // ==================== AI CHATBOT ====================
    
    socket.on('chat-message', async ({ message, spatialData, tourData }) => {
      try {
        console.log(`💬 Chat from ${socket.id}: ${message.substring(0, 50)}...`);
        
        const response = await geminiService.chat(
          socket.id,
          message,
          spatialData,
          tourData
        );

        socket.emit('chat-response', {
          ...response,
          timestamp: Date.now(),
        });

        // Store in room history
        const user = users.get(socket.id);
        if (user) {
          const room = rooms.get(user.roomId);
          if (room) {
            room.chatHistory.push({
              odId: user.odId,
              message,
              response: response.message,
              timestamp: Date.now(),
            });
          }
        }
      } catch (error) {
        console.error('Chat error:', error);
        socket.emit('chat-error', { error: error.message });
      }
    });

    // ==================== VIDEO/AUDIO CALLING ====================
    
    socket.on('call-initiate', ({ targetSocketId, callType }) => {
      const user = users.get(socket.id);
      console.log(`📞 Call initiated: ${socket.id} -> ${targetSocketId} (${callType})`);
      
      io.to(targetSocketId).emit('call-incoming', {
        from: socket.id,
        callerName: user?.odName || 'User',
        callType,
      });
    });

    socket.on('call-accept', ({ targetSocketId }) => {
      console.log(`✅ Call accepted: ${socket.id} -> ${targetSocketId}`);
      io.to(targetSocketId).emit('call-accepted', { from: socket.id });
    });

    socket.on('call-reject', ({ targetSocketId }) => {
      console.log(`❌ Call rejected: ${socket.id} -> ${targetSocketId}`);
      io.to(targetSocketId).emit('call-rejected', { from: socket.id });
    });

    socket.on('call-end', ({ targetSocketId }) => {
      console.log(`📴 Call ended: ${socket.id} -> ${targetSocketId}`);
      io.to(targetSocketId).emit('call-ended', { from: socket.id });
    });

    // WebRTC Signaling
    socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc-offer', { from: socket.id, offer });
    });

    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc-answer', { from: socket.id, answer });
    });

    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });

    // ==================== GUIDED TOUR ====================
    
    socket.on('request-guided-tour', () => {
      const user = users.get(socket.id);
      if (user) {
        // Emit tour start event
        socket.emit('tour-started', {
          message: 'Guided tour starting...',
        });
      }
    });

    socket.on('tour-control', ({ action }) => {
      // Handle tour control (next, prev, pause, stop)
      socket.emit('tour-action', { action });
    });

    // ==================== DISCONNECT ====================
    
    socket.on('disconnect', () => {
      // Remove from client dashboards if applicable
      if (clientDashboards.has(socket.id)) {
        clientDashboards.delete(socket.id);
        console.log('📊 Client dashboard disconnected:', socket.id);
        return;
      }

      const user = users.get(socket.id);
      if (user) {
        socket.to(user.roomId).emit('user-left', {
          socketId: socket.id,
          odId: user.odId,
          userName: user.userName,
        });

        const room = rooms.get(user.roomId);
        if (room) {
          room.participants.delete(socket.id);
          if (room.participants.size === 0) {
            rooms.delete(user.roomId);
          }
        }

        users.delete(socket.id);
        geminiService.clearSession(socket.id);
        
        // Notify client dashboards
        broadcastVisitorUpdates(io);
        
        console.log(`👋 User disconnected: ${socket.id}`);
      }
    });
  });
}
