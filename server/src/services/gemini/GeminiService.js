import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

const DEFAULT_SPACE_CONFIG = SPACE_CONFIGS['J9fEBnyKuiv'];

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.sessions = new Map();
  }

  buildSystemPrompt(spaceConfig = DEFAULT_SPACE_CONFIG) {
    // Get space-specific config from our database
    const knownConfig = SPACE_CONFIGS[spaceConfig.spaceId] || spaceConfig;
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
   - Move to specific viewpoints/sweeps
   - Navigate between floors
   - Go to specific areas${isTrainingCenter ? ' including the meeting room with live stream' : ''}

2. INFORMATION - Provide detailed information about:
   - ${isTrainingCenter ? 'Training rooms and facilities' : 'Products on display'}
   - Sections and layout
   - ${isTrainingCenter ? 'Available equipment and features' : 'Brand information'}
   - What the user is currently looking at

3. MEASUREMENTS - Access dimension tools:
   - Room dimensions
   - ${isTrainingCenter ? 'Seating capacity estimates' : 'Product sizes'}
   - Distance between points
   - Use [MEASURE:show] to display measurement mode

4. GUIDED TOURS - Conduct interactive tours:
   - Full ${isTrainingCenter ? 'facility' : 'store'} tour
   - ${isTrainingCenter ? 'Training room tour, Meeting room tour' : 'Category-specific tours'}
   - Highlight key ${isTrainingCenter ? 'features' : 'products'}

5. SPATIAL AWARENESS - Understand and describe:
   - User's current location
   - What's around them (left, right, behind, above)
   - Nearby ${isTrainingCenter ? 'rooms and facilities' : 'products and displays'}
   - Distance to points of interest
${isTrainingCenter ? '\n6. LIVE STREAM - For the EAAC Training Center:\n   - Guide users to the Meeting Room (Scan 10) for live Teams meetings\n   - Explain the live streaming capabilities\n   - Help users understand how to join virtual sessions' : ''}

=== RESPONSE FORMAT ===
Include these action commands when appropriate:
- [NAV:sweepId] - Navigate to a specific viewpoint
- [ROTATE:left:45] or [ROTATE:right:90] - Turn camera
- [ROTATE:up:30] or [ROTATE:down:30] - Look up/down
- [HIGHLIGHT:tagId] - Highlight a point of interest
- [TOUR:start] - Begin guided tour
- [TOUR:stop] - End guided tour
- [MEASURE:show] - Activate measurement mode
- [FLOOR:up] or [FLOOR:down] - Change floors

=== COMMUNICATION STYLE ===
- Be conversational, friendly, and ${isTrainingCenter ? 'professional' : 'helpful'}
- Use spatial language: "to your left", "behind you", "if you look up"
- Describe what the user is seeing in detail
- Suggest what to explore next
- Be concise but informative
- Answer questions about products, dimensions, and layout
- IMPORTANT: Write in plain text only - NO markdown (no **, *, #, bullets)
- Use arrows (→) or dashes (-) for lists

=== EXAMPLE RESPONSES ===
User: "Where am I?"
Response: "You're currently in the main showroom area, standing near the Beko washing machine display. To your left, you can see the Sharp electronics section, and straight ahead are the La Germania kitchen appliances. Would you like me to show you around or tell you more about any specific products?"

User: "Show me the measurements"
Response: "I'll activate the measurement tool for you. [MEASURE:show] You can now see dimensions in the space. The main showroom area is approximately 8 meters wide. Would you like me to measure any specific area or product?"

Remember: You have full access to all space data. Be specific, helpful, and guide users through this electronics store!`;
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
    const config = spaceConfig || DEFAULT_SPACE_CONFIG;
    
    this.sessions.set(sessionId, {
      spaceConfig: config,
      history: [],
      tourState: null,
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
      const floorList = tourData.floors?.map(f => `${f.name || f.id} (${f.id})`).join(', ') || 'Single floor';
      const tagList = tourData.tags?.map(t => `${t.label || 'Tag'} (${t.id})`).join(', ') || 'None';
      const roomList = tourData.rooms?.map(r => r.name || r.id).join(', ') || 'Open layout';
      
      tourContext = `
=== COMPLETE SPACE DATA ===
Model ID: ${tourData.modelId || 'J9fEBnyKuiv'}
Model Name: ${tourData.modelName || 'Awni Electronics Store'}

NAVIGATION DATA:
- Total Viewpoints (Sweeps): ${tourData.sweeps?.length || 0}
- Available Sweep IDs: ${sweepList}

FLOOR DATA:
- Total Floors: ${tourData.floors?.length || 1}
- Floors: ${floorList}

ROOMS/SECTIONS:
- Detected Areas: ${tourData.rooms?.length || 0}
- Areas: ${roomList}

POINTS OF INTEREST (Tags):
- Total Tags: ${tourData.tags?.length || 0}
- Tags: ${tagList}

MEASUREMENTS:
- Measurement Mode: Available
- Can measure distances, areas, and dimensions

You can navigate to any sweep ID using [NAV:sweepId], highlight tags using [HIGHLIGHT:tagId], or show measurements using [MEASURE:show].`;
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
        shouldSpeak: parsed.actions.some(a => a.type === 'TOUR_CONTROL'),
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
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

export default new GeminiService();
