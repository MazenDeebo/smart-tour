import { create } from 'zustand';

export const useTourStore = create((set, get) => ({
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
    // Cursor/Pointer tracking
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

  // Actions
  setSocket: (socket) => set({ socket }),
  setConnected: (isConnected) => set({ isConnected }),
  setMpSdk: (mpSdk) => set({ mpSdk, isSDKReady: !!mpSdk }),
  setModelId: (modelId) => set({ modelId }),
  setSpaceConfig: (spaceConfig) => set({ spaceConfig }),
  
  updateSpatial: (updates) => set((state) => ({
    spatial: { ...state.spatial, ...updates }
  })),
  
  setTourData: (tourData) => set({ tourData }),
  
  // Chat
  addMessage: (message) => set((state) => ({
    chat: { ...state.chat, messages: [...state.chat.messages, message] }
  })),
  
  setChatLoading: (isLoading) => set((state) => ({
    chat: { ...state.chat, isLoading }
  })),
  
  setLoading: (isLoading) => set((state) => ({
    chat: { ...state.chat, isLoading }
  })),
  
  setCapabilities: (capabilities) => set((state) => ({
    chat: { ...state.chat, capabilities }
  })),
  
  clearChat: () => set((state) => ({
    chat: { ...state.chat, messages: [] }
  })),

  // Guided tour
  startGuidedTour: (stops) => set({
    guidedTour: { isActive: true, currentStop: 0, stops, isPaused: false }
  }),
  
  stopGuidedTour: () => set({
    guidedTour: { isActive: false, currentStop: 0, stops: [], isPaused: false }
  }),
  
  setTourStop: (index) => set((state) => ({
    guidedTour: { ...state.guidedTour, currentStop: index }
  })),

  // Call
  updateCall: (updates) => set((state) => ({
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
  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (participant) => set((state) => ({
    participants: [...state.participants.filter(p => p.socketId !== participant.socketId), participant]
  })),
  
  removeParticipant: (socketId) => set((state) => ({
    participants: state.participants.filter(p => p.socketId !== socketId)
  })),

  setUserName: (userName) => set({ userName }),
}));
