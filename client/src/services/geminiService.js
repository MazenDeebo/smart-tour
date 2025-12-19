/**
 * Client-side Gemini AI Service
 * Runs entirely in the browser - no server required
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

// Space configurations for different Matterport models
const SPACE_CONFIGS = {
  // Awni Electronics Store
  'J9fEBnyKuiv': {
    spaceId: 'J9fEBnyKuiv',
    spaceName: 'مؤسسة عوني للاجهزه الكهربائي (Awni Electronics Store)',
    spaceType: 'Retail Electronics Store',
    description: 'Electronics and home appliances showroom featuring brands like Beko, Sharp, LG, La Germania. The store displays washing machines, refrigerators, stoves, air conditioners, and various home electronics.',
    sections: [
      'Main Showroom: Large appliances (washing machines, refrigerators)',
      'Electronics Section: TVs, audio equipment',
      'Kitchen Appliances: Stoves, ovens, microwaves',
      'Small Appliances: Fans, heaters, small electronics',
      'Display Areas: Featured products and promotions'
    ],
    brands: ['Beko', 'Sharp', 'LG', 'La Germania'],
    personality: 'helpful sales assistant'
  },
  
  // EAAC Training Center
  '4X7veq8Dsye': {
    spaceId: '4X7veq8Dsye',
    spaceName: 'مركز EAAC التدريبي - فرع الرياضة (EAAC Training Center - Sporting Branch)',
    spaceType: 'Training Center',
    description: 'Professional training center with meeting rooms, training halls, and modern facilities for corporate training and workshops. Features conference rooms with TVs, whiteboards, and live streaming capabilities.',
    sections: [
      'Reception Area: Welcome desk and waiting area',
      'Main Training Hall: Large capacity training room',
      'Meeting Room (Scan 10): Conference room with TV and whiteboard for live Teams meetings',
      'Computer Lab: Equipped with workstations',
      'Break Room: Refreshment area',
      'Administrative Offices: Staff offices'
    ],
    facilities: ['Conference Room with TV', 'Whiteboard', 'Projector', 'High-speed WiFi', 'Air Conditioning', 'Microsoft Teams Live Stream'],
    personality: 'professional training coordinator',
    specialFeatures: {
      liveStream: {
        enabled: true,
        location: 'Meeting Room (Scan 10)',
        sweepNumber: 10,
        description: 'The meeting room features a large TV screen that can display Microsoft Teams live meetings, perfect for remote training sessions and virtual conferences.'
      }
    }
  }
};

class GeminiService {
  constructor() {
    this.model = null;
    this.sessions = new Map();
    this.initialized = false;
  }

  initialize(apiKey) {
    if (!apiKey) {
      console.warn('⚠️ Gemini API key not provided - AI chat will be disabled');
      return false;
    }
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      this.initialized = true;
      console.log('✅ Gemini AI initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      return false;
    }
  }

  isAvailable() {
    return this.initialized && this.model !== null;
  }

  getSpaceConfig(spaceId) {
    return SPACE_CONFIGS[spaceId] || SPACE_CONFIGS['J9fEBnyKuiv'];
  }

  buildSystemPrompt(spaceConfig) {
    const knownConfig = SPACE_CONFIGS[spaceConfig?.spaceId] || spaceConfig || SPACE_CONFIGS['J9fEBnyKuiv'];
    const isTrainingCenter = knownConfig.spaceType === 'Training Center';
    
    const sectionsText = (knownConfig.sections || []).map(s => `- ${s}`).join('\n');
    const facilitiesText = (knownConfig.facilities || knownConfig.brands || []).join(', ');
    
    let specialFeaturesText = '';
    if (knownConfig.specialFeatures?.liveStream?.enabled) {
      specialFeaturesText = `
=== SPECIAL FEATURES ===
LIVE STREAM CAPABILITY:
- Location: ${knownConfig.specialFeatures.liveStream.location}
- Description: ${knownConfig.specialFeatures.liveStream.description}
- You can guide users to the meeting room (Scan 10) to view live Microsoft Teams meetings
- Use [NAV:scan10] to take users to the live stream location`;
    }

    return `You are an intelligent virtual tour assistant for a Matterport 3D space.

=== YOUR ROLE ===
You are a ${knownConfig.personality || 'friendly, knowledgeable guide'} helping users explore this ${isTrainingCenter ? 'training facility' : 'virtual space'}. You have FULL ACCESS to:
- User's exact position (X, Y, Z coordinates in meters)
- User's viewing direction (rotation angles)
- Current floor and room/section information
- All points of interest and features
- Measurement tools for dimensions
- Complete navigation system
- All sweeps (viewpoints) in the space
${isTrainingCenter ? '- Training room information and live stream capabilities' : '- Product information and store layout'}

=== SPACE INFORMATION ===
Space ID: ${knownConfig.spaceId}
Name: ${knownConfig.spaceName}
Type: ${knownConfig.spaceType}
Description: ${knownConfig.description}

=== ${isTrainingCenter ? 'FACILITY SECTIONS' : 'STORE SECTIONS'} ===
${sectionsText}

=== ${isTrainingCenter ? 'FACILITIES' : 'BRANDS'} ===
${facilitiesText}
${specialFeaturesText}

=== YOUR CAPABILITIES ===
1. NAVIGATION - Guide users to any location or section
2. INFORMATION - Provide detailed information about the space
3. MEASUREMENTS - Access dimension tools with [MEASURE:show]
4. GUIDED TOURS - Conduct interactive tours
5. SPATIAL AWARENESS - Understand user's current location

=== RESPONSE FORMAT ===
Include these action commands when appropriate:
- [NAV:sweepId] - Navigate to a specific viewpoint
- [ROTATE:left:45] or [ROTATE:right:90] - Turn camera
- [HIGHLIGHT:tagId] - Highlight a point of interest
- [TOUR:start] - Begin guided tour
- [MEASURE:show] - Activate measurement mode
- [FLOOR:up] or [FLOOR:down] - Change floors

=== COMMUNICATION STYLE ===
- Be conversational, friendly, and helpful
- Use spatial language: "to your left", "behind you", "if you look up"
- Be concise but informative
- IMPORTANT: Write in plain text only - NO markdown (no **, *, #, bullets)
- Use arrows (→) or dashes (-) for lists`;
  }

  buildSpatialContext(spatial) {
    if (!spatial) return 'No spatial data available.';

    const { position, rotation, currentFloor, currentSweep, nearbyTags, lookingAt } = spatial;

    let context = `
=== CURRENT USER CONTEXT ===
Position: X=${position?.x?.toFixed(2) || 0}, Y=${position?.y?.toFixed(2) || 0}, Z=${position?.z?.toFixed(2) || 0}
Viewing Angle: Horizontal=${rotation?.y?.toFixed(1) || 0}°, Vertical=${rotation?.x?.toFixed(1) || 0}°
Current Floor: ${currentFloor?.name || 'Ground Floor'}
Current Viewpoint: ${currentSweep?.id || 'Unknown'}`;

    if (nearbyTags?.length > 0) {
      context += `\nNearby Points of Interest: ${nearbyTags.map(t => t.label || t.id).join(', ')}`;
    }

    if (lookingAt) {
      context += `\nCurrently Looking At: ${lookingAt}`;
    }

    return context;
  }

  async initializeSession(sessionId, spaceConfig = null) {
    const config = spaceConfig || SPACE_CONFIGS['J9fEBnyKuiv'];
    
    this.sessions.set(sessionId, {
      spaceConfig: config,
      history: [],
      createdAt: Date.now(),
    });

    const greeting = `Welcome to ${config.spaceName}! 👋 

I'm your virtual tour assistant. I can help you:

→ Explore - Navigate through the space
→ Learn - Get information about what you're seeing  
→ Measure - Find dimensions and distances
→ Tour - Take a guided walkthrough

What would you like to do? Feel free to ask me anything about this space!`;

    return {
      greeting,
      capabilities: {
        canNavigate: true,
        canMeasure: true,
        canTour: true,
        canHighlight: true,
      },
    };
  }

  async chat(sessionId, userMessage, spatialData, tourData = null) {
    if (!this.isAvailable()) {
      return {
        message: "I'm sorry, the AI assistant is not available right now. Please check that the Gemini API key is configured correctly.",
        actions: [],
        error: true
      };
    }

    let session = this.sessions.get(sessionId);
    
    if (!session) {
      await this.initializeSession(sessionId);
      session = this.sessions.get(sessionId);
    }

    const systemPrompt = this.buildSystemPrompt(session.spaceConfig);
    const spatialContext = this.buildSpatialContext(spatialData);

    // Build conversation history
    const historyText = session.history
      .slice(-10)
      .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      .join('\n');

    // Build tour data context if available
    let tourContext = '';
    if (tourData) {
      const sweepList = tourData.sweeps?.slice(0, 20).map(s => s.id).join(', ') || 'None';
      const tagList = tourData.tags?.map(t => `${t.label || 'Tag'} (${t.id})`).join(', ') || 'None';
      
      tourContext = `
=== SPACE DATA ===
Model ID: ${tourData.modelId || 'Unknown'}
Total Viewpoints: ${tourData.sweeps?.length || 0}
Available Sweeps: ${sweepList}
Points of Interest: ${tagList}`;
    }

    const fullPrompt = `${systemPrompt}

${tourContext}

${spatialContext}

=== CONVERSATION HISTORY ===
${historyText || 'No previous messages'}

=== USER MESSAGE ===
${userMessage}

Respond helpfully. Include action commands [NAV:...], [ROTATE:...], etc. when appropriate.`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const rawResponse = result.response.text();

      // Parse response for actions
      const parsed = this.parseResponse(rawResponse);

      // Update history
      session.history.push(
        { role: 'user', content: userMessage, timestamp: Date.now() },
        { role: 'assistant', content: parsed.message, timestamp: Date.now() }
      );

      return {
        message: parsed.message,
        actions: parsed.actions,
        shouldSpeak: false,
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        message: `I encountered an error: ${error.message}. Please try again.`,
        actions: [],
        error: true
      };
    }
  }

  parseResponse(rawResponse) {
    const actions = [];
    let message = rawResponse;

    // Parse [NAV:sweepId]
    const navMatches = rawResponse.matchAll(/\[NAV:([^\]]+)\]/g);
    for (const match of navMatches) {
      actions.push({ type: 'NAVIGATE', sweepId: match[1] });
      message = message.replace(match[0], '');
    }

    // Parse [ROTATE:direction:degrees]
    const rotateMatches = rawResponse.matchAll(/\[ROTATE:(\w+):(\d+)\]/g);
    for (const match of rotateMatches) {
      actions.push({ type: 'ROTATE', direction: match[1], degrees: parseInt(match[2]) });
      message = message.replace(match[0], '');
    }

    // Parse [HIGHLIGHT:tagId]
    const highlightMatches = rawResponse.matchAll(/\[HIGHLIGHT:([^\]]+)\]/g);
    for (const match of highlightMatches) {
      actions.push({ type: 'HIGHLIGHT_TAG', tagId: match[1] });
      message = message.replace(match[0], '');
    }

    // Parse [TOUR:action]
    const tourMatches = rawResponse.matchAll(/\[TOUR:(\w+)\]/g);
    for (const match of tourMatches) {
      actions.push({ type: 'TOUR_CONTROL', action: match[1] });
      message = message.replace(match[0], '');
    }

    // Parse [MEASURE:action]
    const measureMatches = rawResponse.matchAll(/\[MEASURE:(\w+)\]/g);
    for (const match of measureMatches) {
      actions.push({ type: 'SHOW_MEASUREMENT', action: match[1] });
      message = message.replace(match[0], '');
    }

    // Parse [FLOOR:direction]
    const floorMatches = rawResponse.matchAll(/\[FLOOR:(\w+)\]/g);
    for (const match of floorMatches) {
      actions.push({ type: 'CHANGE_FLOOR', direction: match[1] });
      message = message.replace(match[0], '');
    }

    return {
      message: message.trim(),
      actions,
    };
  }

  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }
}

// Export singleton instance
const geminiService = new GeminiService();
export default geminiService;
