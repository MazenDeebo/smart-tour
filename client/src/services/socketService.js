import { io } from 'socket.io-client';
import { useTourStore } from '../store/tourStore';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
  }

  connect() {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupListeners();
    useTourStore.getState().setSocket(this.socket);
    
    return this.socket;
  }

  setupListeners() {
    const store = useTourStore.getState();

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      store.setConnected(true);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      store.setConnected(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
    });

    // Session events
    this.socket.on('session-initialized', ({ greeting, capabilities }) => {
      store.addMessage({
        role: 'assistant',
        content: greeting,
        timestamp: Date.now(),
      });
      store.setCapabilities(capabilities);
    });

    // Chat events
    this.socket.on('chat-response', (response) => {
      store.addMessage({
        role: 'assistant',
        content: response.message,
        actions: response.actions,
        shouldSpeak: response.shouldSpeak,
        timestamp: response.timestamp,
      });
      store.setChatLoading(false);
    });

    this.socket.on('chat-error', (error) => {
      store.addMessage({
        role: 'error',
        content: `Sorry, I encountered an error: ${error.error}`,
        timestamp: Date.now(),
      });
      store.setChatLoading(false);
    });

    // Room events
    this.socket.on('room-state', ({ participants }) => {
      store.setParticipants(participants);
    });

    this.socket.on('user-joined', (user) => {
      store.addParticipant(user);
      store.addMessage({
        role: 'system',
        content: `${user.userName || 'A user'} joined the tour`,
        timestamp: Date.now(),
      });
    });

    this.socket.on('user-left', ({ userName, socketId }) => {
      store.removeParticipant(socketId);
      store.addMessage({
        role: 'system',
        content: `${userName || 'A user'} left the tour`,
        timestamp: Date.now(),
      });
    });

    this.socket.on('participant-moved', ({ socketId, spatialData }) => {
      const participants = useTourStore.getState().participants;
      const updated = participants.map(p => 
        p.socketId === socketId ? { ...p, spatialData } : p
      );
      store.setParticipants(updated);
    });

    // Call events
    this.socket.on('call-incoming', ({ from, callerName, callType }) => {
      store.updateCall({
        state: 'ringing',
        type: callType,
        remoteUser: { socketId: from, name: callerName },
      });
    });

    this.socket.on('call-accepted', () => {
      store.updateCall({ state: 'active' });
    });

    this.socket.on('call-rejected', () => {
      store.resetCall();
    });

    this.socket.on('call-ended', () => {
      store.resetCall();
    });

    // Tour events
    this.socket.on('tour-started', ({ stops }) => {
      store.startGuidedTour(stops || []);
    });

    this.socket.on('tour-stopped', () => {
      store.stopGuidedTour();
    });
  }

  // Emit methods
  initializeSession(spaceConfig) {
    this.socket?.emit('initialize-session', { spaceConfig });
  }

  joinTour(tourId, userId, userName, role = 'guest') {
    this.socket?.emit('join-tour', { tourId, userId, userName, role });
  }

  sendChatMessage(message, spatialData, tourData) {
    const store = useTourStore.getState();
    store.setChatLoading(true);
    store.addMessage({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });
    this.socket?.emit('chat-message', { message, spatialData, tourData });
  }

  updateSpatial(spatialData) {
    this.socket?.emit('spatial-update', spatialData);
  }

  // Call methods
  initiateCall(targetSocketId, callType) {
    this.socket?.emit('call-initiate', { targetSocketId, callType });
    useTourStore.getState().updateCall({ state: 'calling', type: callType });
  }

  acceptCall(targetSocketId) {
    this.socket?.emit('call-accept', { targetSocketId });
  }

  rejectCall(targetSocketId) {
    this.socket?.emit('call-reject', { targetSocketId });
    useTourStore.getState().resetCall();
  }

  endCall(targetSocketId) {
    this.socket?.emit('call-end', { targetSocketId });
    useTourStore.getState().resetCall();
  }

  // WebRTC signaling
  sendOffer(targetSocketId, offer) {
    this.socket?.emit('webrtc-offer', { targetSocketId, offer });
  }

  sendAnswer(targetSocketId, answer) {
    this.socket?.emit('webrtc-answer', { targetSocketId, answer });
  }

  sendIceCandidate(targetSocketId, candidate) {
    this.socket?.emit('webrtc-ice-candidate', { targetSocketId, candidate });
  }

  // Tour
  requestGuidedTour() {
    this.socket?.emit('request-guided-tour');
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocketId() {
    return this.socket?.id;
  }
}

export default new SocketService();
