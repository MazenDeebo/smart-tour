import { io, Socket } from 'socket.io-client';
import { useTourStore } from '../../store/tourStore';
import type { SpaceConfig, SpatialData, TourData, TourStop, CallType } from '../../types.d';

interface SessionResponse {
  greeting: string;
  capabilities: {
    canNavigate: boolean;
    canMeasure: boolean;
    canTour: boolean;
    canHighlight: boolean;
  };
}

interface ChatResponse {
  message: string;
  actions?: Array<{
    type: string;
    [key: string]: unknown;
  }>;
  shouldSpeak?: boolean;
  timestamp: number;
}

interface UserJoinedData {
  socketId: string;
  userName?: string;
}

interface UserLeftData {
  userName?: string;
  socketId: string;
}

interface ParticipantMovedData {
  socketId: string;
  spatialData: SpatialData;
}

interface CallIncomingData {
  from: string;
  callerName: string;
  callType: CallType;
}

interface TourStartedData {
  stops?: TourStop[];
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts: number = 0;

  connect(): Socket | null {
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

  private setupListeners(): void {
    if (!this.socket) return;
    
    const store = useTourStore.getState();

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      store.setConnected(true);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      store.setConnected(false);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('session-initialized', ({ greeting, capabilities }: SessionResponse) => {
      store.addMessage({
        role: 'assistant',
        content: greeting,
        timestamp: Date.now(),
      });
      store.setCapabilities(capabilities);
    });

    this.socket.on('chat-response', (response: ChatResponse) => {
      store.addMessage({
        role: 'assistant',
        content: response.message,
        actions: response.actions as never,
        shouldSpeak: response.shouldSpeak,
        timestamp: response.timestamp,
      });
      store.setChatLoading(false);
    });

    this.socket.on('chat-error', (error: { error: string }) => {
      store.addMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.error}`,
        timestamp: Date.now(),
      });
      store.setChatLoading(false);
    });

    this.socket.on('room-state', ({ participants }: { participants: never[] }) => {
      store.setParticipants(participants);
    });

    this.socket.on('user-joined', (user: UserJoinedData) => {
      store.addParticipant({ socketId: user.socketId, name: user.userName || 'Guest' });
      store.addMessage({
        role: 'assistant',
        content: `${user.userName || 'A user'} joined the tour`,
        timestamp: Date.now(),
      });
    });

    this.socket.on('user-left', ({ userName, socketId }: UserLeftData) => {
      store.removeParticipant(socketId);
      store.addMessage({
        role: 'assistant',
        content: `${userName || 'A user'} left the tour`,
        timestamp: Date.now(),
      });
    });

    this.socket.on('participant-moved', ({ socketId, spatialData }: ParticipantMovedData) => {
      const participants = useTourStore.getState().participants;
      const updated = participants.map(p => 
        p.socketId === socketId ? { ...p, ...spatialData } : p
      );
      store.setParticipants(updated);
    });

    this.socket.on('call-incoming', ({ from, callerName, callType }: CallIncomingData) => {
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

    this.socket.on('tour-started', ({ stops }: TourStartedData) => {
      store.startGuidedTour(stops || []);
    });

    this.socket.on('tour-stopped', () => {
      store.stopGuidedTour();
    });
  }

  initializeSession(spaceConfig: SpaceConfig): void {
    this.socket?.emit('initialize-session', { spaceConfig });
  }

  joinTour(tourId: string, userId: string, userName: string, role: string = 'guest'): void {
    this.socket?.emit('join-tour', { tourId, userId, userName, role });
  }

  sendChatMessage(message: string, spatialData: SpatialData, tourData: TourData): void {
    const store = useTourStore.getState();
    store.setChatLoading(true);
    store.addMessage({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });
    this.socket?.emit('chat-message', { message, spatialData, tourData });
  }

  updateSpatial(spatialData: SpatialData): void {
    this.socket?.emit('spatial-update', spatialData);
  }

  initiateCall(targetSocketId: string, callType: CallType): void {
    this.socket?.emit('call-initiate', { targetSocketId, callType });
    useTourStore.getState().updateCall({ state: 'calling', type: callType });
  }

  acceptCall(targetSocketId: string): void {
    this.socket?.emit('call-accept', { targetSocketId });
  }

  rejectCall(targetSocketId: string): void {
    this.socket?.emit('call-reject', { targetSocketId });
    useTourStore.getState().resetCall();
  }

  endCall(targetSocketId: string): void {
    this.socket?.emit('call-end', { targetSocketId });
    useTourStore.getState().resetCall();
  }

  sendOffer(targetSocketId: string, offer: RTCSessionDescriptionInit): void {
    this.socket?.emit('webrtc-offer', { targetSocketId, offer });
  }

  sendAnswer(targetSocketId: string, answer: RTCSessionDescriptionInit): void {
    this.socket?.emit('webrtc-answer', { targetSocketId, answer });
  }

  sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit): void {
    this.socket?.emit('webrtc-ice-candidate', { targetSocketId, candidate });
  }

  requestGuidedTour(): void {
    this.socket?.emit('request-guided-tour');
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export default new SocketService();
