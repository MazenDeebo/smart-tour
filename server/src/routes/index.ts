import express, { Request, Response, Router } from 'express';
import geminiService from '../services/gemini/GeminiService.js';
import type {
  ChatRequest,
  SessionInitRequest,
  LivestreamRequest,
  PositionUpdateRequest,
  LivestreamConfig,
  WhiteboardConfig,
} from '../types/index.js';

const router: Router = express.Router();

const livestreamStore = new Map<string, LivestreamConfig>();

const WHITEBOARD_CONFIG: WhiteboardConfig = {
  position: { x: -4.77, y: 1.44, z: 5.74 },
  rotation: { x: 0, y: 180, z: 0 },
  scale: { x: 1.2, y: 0.675, z: 1 },
  resolution: { w: 1024, h: 512 }
};

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    modelId: process.env.MATTERPORT_MODEL_ID,
  });
});

// Get space configuration
router.get('/spaces/:modelId/config', (req: Request, res: Response) => {
  const { modelId } = req.params;
  
  const config = {
    spaceId: modelId,
    spaceName: 'Virtual Tour Space',
    spaceType: 'property',
    spaceInfo: {
      description: 'Interactive 3D Virtual Tour',
      features: ['3D Walkthrough', 'Measurements', 'Interactive Tags', 'Guided Tours'],
    },
    aiConfig: {
      personality: 'friendly',
      tone: 'helpful',
      language: 'en',
    },
    guidedTour: {
      enabled: true,
      autoPlay: false,
    },
  };

  res.json(config);
});

// REST endpoint for chat
router.post('/chat', async (req: Request<object, object, ChatRequest>, res: Response) => {
  try {
    const { sessionId, message, spatialData, tourData } = req.body;
    
    const response = await geminiService.chat(
      sessionId || 'rest-session',
      message,
      spatialData || null,
      tourData || null
    );

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Initialize session
router.post('/session/init', async (req: Request<object, object, SessionInitRequest>, res: Response) => {
  try {
    const { sessionId, spaceConfig } = req.body;
    const result = await geminiService.initializeSession(sessionId, spaceConfig || null);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get livestream config for a space
router.get('/livestream/:spaceId', (req: Request, res: Response) => {
  const { spaceId } = req.params;
  const config = livestreamStore.get(spaceId);
  
  if (!config) {
    res.json({
      active: false,
      spaceId,
      whiteboard: WHITEBOARD_CONFIG
    });
    return;
  }
  
  res.json({
    ...config,
    active: true,
    whiteboard: WHITEBOARD_CONFIG
  });
});

// Admin: Set livestream URL
router.post('/admin/livestream/:spaceId', (req: Request<{ spaceId: string }, object, LivestreamRequest>, res: Response) => {
  const { spaceId } = req.params;
  const { teamsUrl, videoUrl, adminId, title } = req.body;
  
  const url = videoUrl || teamsUrl;
  
  if (!url) {
    res.status(400).json({ error: 'Video URL is required' });
    return;
  }
  
  const config: LivestreamConfig = {
    spaceId,
    teamsUrl: url,
    videoUrl: url,
    title: title || 'Live Stream',
    adminId: adminId || 'admin',
    createdAt: new Date().toISOString(),
    active: true,
    whiteboard: WHITEBOARD_CONFIG
  };
  
  livestreamStore.set(spaceId, config);
  console.log(`📺 Livestream set for space ${spaceId}:`, url);
  
  res.json({
    success: true,
    message: 'Livestream configured successfully',
    config
  });
});

// Admin: Update whiteboard position
router.put('/admin/livestream/:spaceId/position', (req: Request<{ spaceId: string }, object, PositionUpdateRequest>, res: Response) => {
  const { spaceId } = req.params;
  const { position, rotation, scale } = req.body;
  
  const config = livestreamStore.get(spaceId) || { spaceId, active: false };
  
  config.whiteboard = {
    ...WHITEBOARD_CONFIG,
    position: position || WHITEBOARD_CONFIG.position,
    rotation: rotation || WHITEBOARD_CONFIG.rotation,
    scale: scale || WHITEBOARD_CONFIG.scale
  };
  
  livestreamStore.set(spaceId, config as LivestreamConfig);
  
  res.json({
    success: true,
    message: 'Whiteboard position updated',
    whiteboard: config.whiteboard
  });
});

// Admin: Stop livestream
router.delete('/admin/livestream/:spaceId', (req: Request, res: Response) => {
  const { spaceId } = req.params;
  
  if (livestreamStore.has(spaceId)) {
    const config = livestreamStore.get(spaceId)!;
    config.active = false;
    config.stoppedAt = new Date().toISOString();
    livestreamStore.set(spaceId, config);
  }
  
  res.json({
    success: true,
    message: 'Livestream stopped'
  });
});

// Get whiteboard config
router.get('/whiteboard/config', (_req: Request, res: Response) => {
  res.json(WHITEBOARD_CONFIG);
});

export default router;
