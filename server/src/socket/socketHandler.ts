import type { Server, Socket } from 'socket.io';
import geminiService from '../services/gemini/GeminiService.js';
import type {
  User,
  Room,
  SpatialData,
  JoinTourData,
  ChatMessageData,
  CallData,
  WebRTCData,
  SpaceConfig,
} from '../types/index.js';

const users = new Map<string, User>();
const rooms = new Map<string, Room>();
const clientDashboards = new Set<string>();

interface VisitorInfo {
  socketId: string;
  odId: string;
  userName: string;
  role: string;
  spatial: SpatialData | null;
  joinedAt: number;
  roomId: string;
}

function broadcastVisitorUpdates(io: Server): void {
  const visitors: VisitorInfo[] = Array.from(users.entries())
    .filter(([, user]) => user.role !== 'client')
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

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('✅ User connected:', socket.id);

    // Session Initialization
    socket.on('initialize-session', async ({ spaceConfig }: { spaceConfig: SpaceConfig }) => {
      try {
        const result = await geminiService.initializeSession(socket.id, spaceConfig);
        socket.emit('session-initialized', result);
        console.log('📝 Session initialized for:', socket.id);
      } catch (error) {
        const err = error as Error;
        socket.emit('session-error', { error: err.message });
      }
    });

    // Client Dashboard
    socket.on('join-as-client', () => {
      clientDashboards.add(socket.id);
      console.log('📊 Client dashboard connected:', socket.id);
      broadcastVisitorUpdates(io);
    });

    // Tour Room Management
    socket.on('join-tour', ({ tourId, userId, userName, role }: JoinTourData) => {
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
      
      broadcastVisitorUpdates(io);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          tourId,
          participants: new Map(),
          chatHistory: [],
        });
      }

      const room = rooms.get(roomId)!;
      const user = users.get(socket.id)!;
      room.participants.set(socket.id, { odId: user.odId, userName: user.userName, role });

      socket.to(roomId).emit('user-joined', {
        odId: user.odId,
        userName: user.userName,
        role,
        socketId: socket.id,
      });

      socket.emit('room-state', {
        participants: Array.from(room.participants.entries()).map(([sid, data]) => ({
          socketId: sid,
          ...data,
        })),
      });

      console.log(`👤 ${user.userName} joined tour ${tourId}`);
    });

    // Spatial Tracking
    socket.on('spatial-update', (spatialData: SpatialData) => {
      const user = users.get(socket.id);
      if (user) {
        user.spatialData = spatialData;
        socket.to(user.roomId).emit('participant-moved', {
          socketId: socket.id,
          spatialData,
        });
        
        clientDashboards.forEach(clientId => {
          io.to(clientId).emit('visitor-spatial-update', {
            odId: user.odId,
            socketId: socket.id,
            spatialData,
          });
        });
      }
    });

    // AI Chatbot
    socket.on('chat-message', async ({ message, spatialData, tourData }: ChatMessageData) => {
      try {
        console.log(`💬 Chat from ${socket.id}: ${message.substring(0, 50)}...`);
        
        const response = await geminiService.chat(socket.id, message, spatialData, tourData);

        socket.emit('chat-response', {
          ...response,
          timestamp: Date.now(),
        });

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
        const err = error as Error;
        console.error('Chat error:', err);
        socket.emit('chat-error', { error: err.message });
      }
    });

    // Video/Audio Calling
    socket.on('call-initiate', ({ targetSocketId, callType }: CallData) => {
      const user = users.get(socket.id);
      console.log(`📞 Call initiated: ${socket.id} -> ${targetSocketId} (${callType})`);
      
      io.to(targetSocketId).emit('call-incoming', {
        from: socket.id,
        callerName: user?.userName || 'User',
        callType,
      });
    });

    socket.on('call-accept', ({ targetSocketId }: CallData) => {
      console.log(`✅ Call accepted: ${socket.id} -> ${targetSocketId}`);
      io.to(targetSocketId).emit('call-accepted', { from: socket.id });
    });

    socket.on('call-reject', ({ targetSocketId }: CallData) => {
      console.log(`❌ Call rejected: ${socket.id} -> ${targetSocketId}`);
      io.to(targetSocketId).emit('call-rejected', { from: socket.id });
    });

    socket.on('call-end', ({ targetSocketId }: CallData) => {
      console.log(`📴 Call ended: ${socket.id} -> ${targetSocketId}`);
      io.to(targetSocketId).emit('call-ended', { from: socket.id });
    });

    // WebRTC Signaling
    socket.on('webrtc-offer', ({ targetSocketId, offer }: WebRTCData) => {
      io.to(targetSocketId).emit('webrtc-offer', { from: socket.id, offer });
    });

    socket.on('webrtc-answer', ({ targetSocketId, answer }: WebRTCData) => {
      io.to(targetSocketId).emit('webrtc-answer', { from: socket.id, answer });
    });

    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }: WebRTCData) => {
      io.to(targetSocketId).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });

    // Guided Tour
    socket.on('request-guided-tour', () => {
      const user = users.get(socket.id);
      if (user) {
        socket.emit('tour-started', { message: 'Guided tour starting...' });
      }
    });

    socket.on('tour-control', ({ action }: { action: string }) => {
      socket.emit('tour-action', { action });
    });

    // Disconnect
    socket.on('disconnect', () => {
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
        broadcastVisitorUpdates(io);
        
        console.log(`👋 User disconnected: ${socket.id}`);
      }
    });
  });
}
