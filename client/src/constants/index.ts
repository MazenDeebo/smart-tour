// Environment variables with defaults
export const ENV = {
  SERVER_URL: import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  MATTERPORT_SDK_KEY: import.meta.env.VITE_MATTERPORT_SDK_KEY || 'bnx9rtn9umenhf4ym8bngu7ud',
  DEFAULT_MODEL_ID: import.meta.env.VITE_DEFAULT_MODEL_ID || 'J9fEBnyKuiv',
  BASE_URL: import.meta.env.BASE_URL || '/',
} as const;

// SDK Configuration
export const SDK_CONFIG = {
  USE_BUNDLE: true,
  BUNDLE_PATH: '/bundle/showcase.html',
} as const;

// WebRTC Configuration
export const WEBRTC_CONFIG = {
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
} as const;

// Socket Events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Session
  SESSION_INIT: 'session-init',
  SESSION_INITIALIZED: 'session-initialized',
  
  // Tour
  JOIN_TOUR: 'join-tour',
  LEAVE_TOUR: 'leave-tour',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  
  // Spatial
  SPATIAL_UPDATE: 'spatial-update',
  PARTICIPANT_MOVED: 'participant-moved',
  
  // Chat
  CHAT_MESSAGE: 'chat-message',
  CHAT_RESPONSE: 'chat-response',
  
  // Call
  CALL_USER: 'call-user',
  CALL_INCOMING: 'call-incoming',
  CALL_ACCEPTED: 'call-accepted',
  CALL_REJECTED: 'call-rejected',
  CALL_ENDED: 'call-ended',
  
  // WebRTC
  WEBRTC_OFFER: 'webrtc-offer',
  WEBRTC_ANSWER: 'webrtc-answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc-ice-candidate',
  
  // Tour Control
  TOUR_START: 'tour-start',
  TOUR_STARTED: 'tour-started',
  TOUR_STOP: 'tour-stop',
  TOUR_NEXT: 'tour-next',
  TOUR_PREV: 'tour-prev',
} as const;

// Livestream Configuration
export const LIVESTREAM_CONFIG = {
  STORAGE_KEY: 'matterport_livestream_config',
  DEFAULT_RESOLUTION: { w: 1280, h: 720 },
  DEFAULT_SCALE: { x: 1.6, y: 0.975, z: 1 },
} as const;

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 100,
  TOAST_DURATION: 3000,
} as const;
