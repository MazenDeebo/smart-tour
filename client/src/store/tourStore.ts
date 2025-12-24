import { create } from 'zustand';
import type {
  TourStore,
  SpatialData,
  TourData,
  ChatMessage,
  ChatCapabilities,
  Call,
  Participant,
  TourStop,
  SpaceConfig,
  MatterportSDK,
} from '../types';

export const useTourStore = create<TourStore>()((set) => ({
  // Connection
  socket: null,
  isConnected: false,
  
  // Matterport
  mpSdk: null,
  isSDKReady: false,
  modelId: import.meta.env.VITE_DEFAULT_MODEL_ID || 'J9fEBnyKuiv',
  
  // Space config
  spaceConfig: null,
  
  // Spatial data
  spatial: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0 },
    currentSweep: null,
    currentFloor: null,
    currentRoom: null,
    nearbyTags: [],
    lookingAt: null,
    cursorPosition: { x: 0, y: 0, z: 0 },
    cursorObject: null,
    cursorNormal: null,
  },
  
  // Tour data from SDK
  tourData: {
    sweeps: [],
    floors: [],
    rooms: [],
    tags: [],
    measurements: [],
  },
  
  // Guided tour
  guidedTour: {
    isActive: false,
    currentStop: 0,
    stops: [],
    isPaused: false,
  },
  
  // Chat
  chat: {
    messages: [],
    isLoading: false,
    capabilities: null,
  },
  
  // Call
  call: {
    state: 'idle',
    type: null,
    remoteUser: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
  },
  
  // Participants
  participants: [],
  userId: `user_${Date.now()}`,
  userName: 'Guest',
  
  // YouTube Overlay
  youtubeOverlay: {
    isVisible: false,
    videoUrl: '',
    title: '',
  },

  // Actions
  setSocket: (socket: unknown) => set({ socket }),
  setConnected: (isConnected: boolean) => set({ isConnected }),
  setMpSdk: (mpSdk: MatterportSDK | null) => set({ mpSdk, isSDKReady: !!mpSdk }),
  setModelId: (modelId: string) => set({ modelId }),
  setSpaceConfig: (spaceConfig: SpaceConfig | null) => set({ spaceConfig }),
  
  updateSpatial: (updates: Partial<SpatialData>) => set((state) => ({
    spatial: { ...state.spatial, ...updates }
  })),
  
  setTourData: (tourData: TourData) => set({ tourData }),
  
  // Chat
  addMessage: (message: ChatMessage) => set((state) => ({
    chat: { ...state.chat, messages: [...state.chat.messages, message] }
  })),
  
  setChatLoading: (isLoading: boolean) => set((state) => ({
    chat: { ...state.chat, isLoading }
  })),
  
  setLoading: (isLoading: boolean) => set((state) => ({
    chat: { ...state.chat, isLoading }
  })),
  
  setCapabilities: (capabilities: ChatCapabilities | null) => set((state) => ({
    chat: { ...state.chat, capabilities }
  })),
  
  clearChat: () => set((state) => ({
    chat: { ...state.chat, messages: [] }
  })),

  // Guided tour
  startGuidedTour: (stops: TourStop[]) => set({
    guidedTour: { isActive: true, currentStop: 0, stops, isPaused: false }
  }),
  
  stopGuidedTour: () => set({
    guidedTour: { isActive: false, currentStop: 0, stops: [], isPaused: false }
  }),
  
  setTourStop: (index: number) => set((state) => ({
    guidedTour: { ...state.guidedTour, currentStop: index }
  })),

  // Call
  updateCall: (updates: Partial<Call>) => set((state) => ({
    call: { ...state.call, ...updates }
  })),
  
  resetCall: () => set({
    call: {
      state: 'idle',
      type: null,
      remoteUser: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
    }
  }),

  // Participants
  setParticipants: (participants: Participant[]) => set({ participants }),
  
  addParticipant: (participant: Participant) => set((state) => ({
    participants: [...state.participants.filter(p => p.socketId !== participant.socketId), participant]
  })),
  
  removeParticipant: (socketId: string) => set((state) => ({
    participants: state.participants.filter(p => p.socketId !== socketId)
  })),

  setUserName: (userName: string) => set({ userName }),
  
  // YouTube Overlay
  showYouTubeOverlay: (videoUrl: string, title: string) => set({
    youtubeOverlay: { isVisible: true, videoUrl, title }
  }),
  
  hideYouTubeOverlay: () => set({
    youtubeOverlay: { isVisible: false, videoUrl: '', title: '' }
  }),
}));
