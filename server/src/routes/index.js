import express from 'express';
import geminiService from '../services/gemini/GeminiService.js';

const router = express.Router();

// In-memory storage for livestream configurations (per space)
const livestreamStore = new Map();

// Default whiteboard position based on actual cursor coordinates from scan 10
// Camera: X: -1.85, Y: 1.91, Z: 4.46
// Cursor on whiteboard: X: 5.84, Y: 1.54, Z: 2.93
// Direction: NE (62°) - whiteboard faces Southwest (~240°)
// TV screen config for EAAC Training Center
const WHITEBOARD_CONFIG = {
  // Position in 3D space (cursor position on whiteboard)
  position: { x: -4.77, y: 1.44, z: 5.74 },
  // Rotation to face the viewer (opposite of camera direction)
  rotation: { x: 0, y: 180, z: 0 },
  // Scale based on whiteboard dimensions (7'11" x 3'11" = ~2m x 1m)
  scale: { x: 1.2, y: 0.675, z: 1 },
  // Resolution for the canvas
  resolution: { w: 1024, h: 512 }
};

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    modelId: process.env.MATTERPORT_MODEL_ID,
  });
});

// Get space configuration
router.get('/spaces/:modelId/config', (req, res) => {
  const { modelId } = req.params;
  
  // Return default config for the model
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

// REST endpoint for chat (alternative to socket)
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message, spatialData, tourData } = req.body;
    
    const response = await geminiService.chat(
      sessionId || 'rest-session',
      message,
      spatialData,
      tourData
    );

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize session
router.post('/session/init', async (req, res) => {
  try {
    const { sessionId, spaceConfig } = req.body;
    const result = await geminiService.initializeSession(sessionId, spaceConfig);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// LIVESTREAM ADMIN ROUTES
// ==========================================

// Get livestream config for a space (for users to view)
router.get('/livestream/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  const config = livestreamStore.get(spaceId);
  
  if (!config) {
    return res.json({
      active: false,
      spaceId,
      whiteboard: WHITEBOARD_CONFIG
    });
  }
  
  res.json({
    active: true,
    ...config,
    whiteboard: WHITEBOARD_CONFIG
  });
});

// Admin: Set livestream URL for a space (supports any video URL)
router.post('/admin/livestream/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  const { teamsUrl, videoUrl, adminId, title } = req.body;
  
  // Support both teamsUrl and videoUrl for backward compatibility
  const url = videoUrl || teamsUrl;
  
  if (!url) {
    return res.status(400).json({ error: 'Video URL is required' });
  }
  
  const config = {
    spaceId,
    teamsUrl: url, // Keep for backward compatibility
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
router.put('/admin/livestream/:spaceId/position', (req, res) => {
  const { spaceId } = req.params;
  const { position, rotation, scale } = req.body;
  
  const config = livestreamStore.get(spaceId) || { spaceId, active: false };
  
  config.whiteboard = {
    ...WHITEBOARD_CONFIG,
    position: position || WHITEBOARD_CONFIG.position,
    rotation: rotation || WHITEBOARD_CONFIG.rotation,
    scale: scale || WHITEBOARD_CONFIG.scale
  };
  
  livestreamStore.set(spaceId, config);
  
  res.json({
    success: true,
    message: 'Whiteboard position updated',
    whiteboard: config.whiteboard
  });
});

// Admin: Stop livestream
router.delete('/admin/livestream/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  
  if (livestreamStore.has(spaceId)) {
    const config = livestreamStore.get(spaceId);
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
router.get('/whiteboard/config', (req, res) => {
  res.json(WHITEBOARD_CONFIG);
});

export default router;
