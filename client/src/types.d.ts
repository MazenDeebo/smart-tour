// ============================================
// Matterport Smart Tour - TypeScript Type Definitions
// ============================================

// ============================================
// Spatial Types
// ============================================
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  x: number;
  y: number;
  z?: number;
}

export interface Scale {
  x: number;
  y: number;
  z: number;
}

export interface Resolution {
  w: number;
  h: number;
}

export interface SpatialData {
  position: Position;
  rotation: Rotation;
  currentSweep: string | null;
  currentFloor: number | null;
  currentRoom: string | null;
  nearbyTags: Tag[];
  lookingAt: string | null;
  cursorPosition: Position;
  cursorObject: string | null;
  cursorNormal: Position | null;
}

// ============================================
// Tour Data Types
// ============================================
export interface Sweep {
  id: string;
  position: Position;
  rotation?: Rotation;
  floor?: number;
  neighbors?: string[];
}

export interface Floor {
  id: string;
  name: string;
  sequence: number;
}

export interface Room {
  id: string;
  name: string;
  floor: number;
}

export interface Tag {
  id: string;
  sid?: string;
  label?: string;
  description?: string;
  position?: Position;
  anchorPosition?: Position;
  stemVector?: Position;
  color?: string;
  mediaType?: string;
  mediaSrc?: string;
}

export interface Measurement {
  id: string;
  start: Position;
  end: Position;
  distance: number;
}

export interface TourData {
  sweeps: Sweep[];
  floors: Floor[];
  rooms: Room[];
  tags: Tag[];
  measurements: Measurement[];
  modelId?: string;
}

// ============================================
// Space Configuration Types
// ============================================
export interface SpaceConfig {
  id: string;
  modelId: string;
  nameEn: string;
  nameAr?: string;
  type: string;
  description?: string;
  sections?: string[];
  facilities?: string[];
  brands?: string[];
  personality?: string;
  specialFeatures?: {
    liveStream?: {
      enabled: boolean;
      location: string;
      sweepNumber: number;
      description: string;
    };
  };
}

// ============================================
// Livestream Types
// ============================================
export type VideoType = 'direct' | 'hls' | 'youtube' | 'meeting' | 'rtmp' | 'webcam' | 'unknown';

export interface LivestreamConfig {
  position: Position;
  rotation: Rotation;
  scale: Scale;
  resolution: Resolution;
}

export interface TagConfig extends LivestreamConfig {
  name: string;
  label: string;
}

export interface StreamConfig {
  active: boolean;
  videoUrl?: string;
  teamsUrl?: string;
  title?: string;
  position?: Position;
  rotation?: Rotation;
  scale?: Scale;
}

// ============================================
// Chat Types
// ============================================
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  actions?: ChatAction[];
  shouldSpeak?: boolean;
  error?: boolean;
}

export interface ChatAction {
  type: 'NAVIGATE' | 'ROTATE' | 'HIGHLIGHT_TAG' | 'TOUR' | 'MEASURE' | 'FLOOR';
  sweepId?: string;
  direction?: string;
  degrees?: number;
  tagId?: string;
  action?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  capabilities: ChatCapabilities | null;
}

export interface ChatCapabilities {
  canNavigate: boolean;
  canMeasure: boolean;
  canTour: boolean;
  canHighlight: boolean;
}

// ============================================
// Call Types
// ============================================
export type CallState = 'idle' | 'calling' | 'ringing' | 'active';
export type CallType = 'audio' | 'video' | null;

export interface Call {
  state: CallState;
  type: CallType;
  remoteUser: Participant | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

// ============================================
// Participant Types
// ============================================
export interface Participant {
  socketId: string;
  name: string;
  position?: Position;
  rotation?: Rotation;
  currentSweep?: string;
  isAdmin?: boolean;
}

// ============================================
// Guided Tour Types
// ============================================
export interface TourStop {
  sweepId: string;
  title: string;
  description: string;
  duration?: number;
}

export interface GuidedTour {
  isActive: boolean;
  currentStop: number;
  stops: TourStop[];
  isPaused: boolean;
}

// ============================================
// YouTube Overlay Types
// ============================================
export interface YouTubeOverlayState {
  isVisible: boolean;
  videoUrl: string;
  title: string;
}

// ============================================
// Store Types
// ============================================
export interface TourStoreState {
  socket: unknown | null;
  isConnected: boolean;
  mpSdk: MatterportSDK | null;
  isSDKReady: boolean;
  modelId: string;
  spaceConfig: SpaceConfig | null;
  spatial: SpatialData;
  tourData: TourData;
  guidedTour: GuidedTour;
  chat: ChatState;
  call: Call;
  participants: Participant[];
  userId: string;
  userName: string;
  youtubeOverlay: YouTubeOverlayState;
}

export interface TourStoreActions {
  setSocket: (socket: unknown) => void;
  setConnected: (isConnected: boolean) => void;
  setMpSdk: (mpSdk: MatterportSDK | null) => void;
  setModelId: (modelId: string) => void;
  setSpaceConfig: (spaceConfig: SpaceConfig | null) => void;
  updateSpatial: (updates: Partial<SpatialData>) => void;
  setTourData: (tourData: TourData) => void;
  addMessage: (message: ChatMessage) => void;
  setChatLoading: (isLoading: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setCapabilities: (capabilities: ChatCapabilities | null) => void;
  clearChat: () => void;
  startGuidedTour: (stops: TourStop[]) => void;
  stopGuidedTour: () => void;
  setTourStop: (index: number) => void;
  updateCall: (updates: Partial<Call>) => void;
  resetCall: () => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (socketId: string) => void;
  setUserName: (userName: string) => void;
  showYouTubeOverlay: (videoUrl: string, title: string) => void;
  hideYouTubeOverlay: () => void;
}

export type TourStore = TourStoreState & TourStoreActions;

// ============================================
// Matterport SDK Types
// ============================================
export interface MatterportSDK {
  Scene: {
    createObjects: (count: number) => Promise<SceneObject[]>;
    register: (name: string, factory: () => unknown) => void;
  };
  Sweep: {
    current: {
      subscribe: (callback: (sweep: Sweep) => void) => { cancel: () => void };
    };
    moveTo: (sweepId: string, options?: object) => Promise<void>;
  };
  Camera: {
    pose: {
      subscribe: (callback: (pose: CameraPose) => void) => { cancel: () => void };
    };
    rotate: (rotation: number, options?: object) => Promise<void>;
  };
  Floor: {
    current: {
      subscribe: (callback: (floor: { id: string; sequence: number }) => void) => { cancel: () => void };
    };
    moveTo: (floorId: string) => Promise<void>;
  };
  Mattertag: {
    getData: () => Promise<Tag[]>;
    navigateToTag: (tagId: string, transition?: string) => Promise<void>;
  };
  Tag: {
    data: {
      subscribe: (callback: (tags: Tag[]) => void) => { cancel: () => void };
    };
  };
  Model: {
    getData: () => Promise<{ sweeps: Sweep[] }>;
  };
  Pointer: {
    intersection: {
      subscribe: (callback: (intersection: PointerIntersection) => void) => { cancel: () => void };
    };
  };
  Measurements: {
    toggleMode: (enabled: boolean) => Promise<void>;
    data: {
      subscribe: (callback: (measurements: Measurement[]) => void) => { cancel: () => void };
    };
  };
}

export interface SceneObject {
  addNode: () => SceneNode;
  start: () => void;
  stop: () => void;
}

export interface SceneNode {
  position: { set: (x: number, y: number, z: number) => void };
  quaternion: { set: (x: number, y: number, z: number, w: number) => void };
  scale: { set: (x: number, y: number, z: number) => void };
  addComponent: (name: string, options: object) => SceneComponent;
  start: () => void;
  stop: () => void;
}

export interface SceneComponent {
  inputs: Record<string, unknown>;
}

export interface CameraPose {
  position: Position;
  rotation: Rotation;
  mode: string;
}

export interface PointerIntersection {
  position: Position;
  normal: Position;
  object: string;
}

// ============================================
// Component Props Types
// ============================================
export interface AdminLiveStreamPanelProps {
  spaceConfig?: SpaceConfig;
  isAdmin?: boolean;
}

export interface ControlPanelProps {
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  showParticipants: boolean;
  setShowParticipants: (show: boolean) => void;
  participantCount: number;
}

export interface MatterportViewerProps {
  modelId?: string;
}

export interface SpaceSelectorProps {
  currentSpace: SpaceConfig | null;
  onSpaceChange: (space: SpaceConfig) => void;
}

export interface YouTubeOverlayProps {
  videoUrl: string;
  title: string;
  isVisible: boolean;
  onClose: () => void;
}

// ============================================
// Gemini Service Types
// ============================================
export interface GeminiResponse {
  message: string;
  actions: ChatAction[];
  shouldSpeak?: boolean;
  error?: boolean;
}

export interface GeminiSession {
  history: ChatMessage[];
  spaceConfig: SpaceConfig;
}

// ============================================
// Socket Service Types
// ============================================
export interface SocketEvents {
  connect: () => void;
  disconnect: () => void;
  'user:joined': (participant: Participant) => void;
  'user:left': (socketId: string) => void;
  'user:position': (data: { socketId: string; position: Position; rotation: Rotation }) => void;
  'call:incoming': (data: { from: Participant; type: CallType }) => void;
  'call:accepted': (data: { from: Participant }) => void;
  'call:rejected': (data: { from: Participant }) => void;
  'call:ended': () => void;
  'webrtc:offer': (data: { offer: RTCSessionDescriptionInit; from: string }) => void;
  'webrtc:answer': (data: { answer: RTCSessionDescriptionInit; from: string }) => void;
  'webrtc:ice-candidate': (data: { candidate: RTCIceCandidateInit; from: string }) => void;
}

// ============================================
// Vite Environment Types
// ============================================
interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
  readonly VITE_CLIENT_PORT: string;
  readonly VITE_MATTERPORT_SDK_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_MODEL_AWNI: string;
  readonly VITE_MODEL_EAAC: string;
  readonly VITE_DEFAULT_MODEL_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
