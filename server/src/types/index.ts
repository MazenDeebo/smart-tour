// ============================================
// Server Type Definitions
// ============================================

import type { Server, Socket } from 'socket.io';

// ============================================
// Position & Spatial Types
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

export interface SpatialData {
  position?: Position;
  rotation?: Rotation;
  currentFloor?: { name: string; id: string };
  currentSweep?: { id: string };
  nearbyTags?: Array<{ id: string; label?: string }>;
  lookingAt?: string;
}

// ============================================
// User & Room Types
// ============================================
export interface User {
  odId: string;
  userName: string;
  role: string;
  roomId: string;
  spatialData: SpatialData | null;
  joinedAt: number;
}

export interface RoomParticipant {
  odId: string;
  userName: string;
  role: string;
}

export interface Room {
  tourId: string;
  participants: Map<string, RoomParticipant>;
  chatHistory: ChatHistoryEntry[];
}

export interface ChatHistoryEntry {
  odId: string;
  message: string;
  response: string;
  timestamp: number;
}

// ============================================
// Space Configuration Types
// ============================================
export interface SpaceConfig {
  spaceId: string;
  spaceName: string;
  spaceType: string;
  description: string;
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
// Tour Data Types
// ============================================
export interface Sweep {
  id: string;
  position?: Position;
}

export interface Floor {
  id: string;
  name?: string;
}

export interface Tag {
  id: string;
  label?: string;
}

export interface TourRoom {
  id: string;
  name?: string;
}

export interface TourData {
  modelId?: string;
  modelName?: string;
  sweeps?: Sweep[];
  floors?: Floor[];
  tags?: Tag[];
  rooms?: TourRoom[];
}

// ============================================
// Chat Types
// ============================================
export interface ChatAction {
  type: string;
  sweepId?: string;
  direction?: string;
  degrees?: number;
  tagId?: string;
  action?: string;
}

export interface ChatResponse {
  message: string;
  actions: ChatAction[];
  shouldSpeak?: boolean;
}

export interface GeminiSession {
  spaceConfig: SpaceConfig;
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  tourState: unknown;
  createdAt: number;
}

// ============================================
// Livestream Types
// ============================================
export interface WhiteboardConfig {
  position: Position;
  rotation: Rotation;
  scale: Position;
  resolution: { w: number; h: number };
}

export interface LivestreamConfig {
  spaceId: string;
  teamsUrl?: string;
  videoUrl?: string;
  title?: string;
  adminId?: string;
  createdAt?: string;
  stoppedAt?: string;
  active: boolean;
  whiteboard?: WhiteboardConfig;
}

// ============================================
// Socket Event Types
// ============================================
export interface JoinTourData {
  tourId: string;
  userId: string;
  userName: string;
  role: string;
}

export interface ChatMessageData {
  message: string;
  spatialData: SpatialData;
  tourData: TourData;
}

export interface CallData {
  targetSocketId: string;
  callType?: string;
}

export interface WebRTCData {
  targetSocketId: string;
  offer?: { type: string; sdp: string };
  answer?: { type: string; sdp: string };
  candidate?: { candidate: string; sdpMid?: string; sdpMLineIndex?: number };
}

// ============================================
// Express Types
// ============================================
export interface SessionInitRequest {
  sessionId: string;
  spaceConfig?: SpaceConfig;
}

export interface ChatRequest {
  sessionId?: string;
  message: string;
  spatialData?: SpatialData;
  tourData?: TourData;
}

export interface LivestreamRequest {
  teamsUrl?: string;
  videoUrl?: string;
  adminId?: string;
  title?: string;
}

export interface PositionUpdateRequest {
  position?: Position;
  rotation?: Rotation;
  scale?: Position;
}

// ============================================
// Socket.io Extended Types
// ============================================
export type SocketServer = Server;
export type SocketClient = Socket;
