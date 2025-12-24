import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';
import type { SpaceConfig, SpatialData, TourData, ChatAction, ChatResponse, GeminiSession } from '../../types/index.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SPACE_CONFIGS: Record<string, SpaceConfig> = {
  'J9fEBnyKuiv': {
    spaceId: 'J9fEBnyKuiv',
    spaceName: 'مؤسسة عوني للاجهزه الكهربائي (Awni Electronics Store)',
    spaceType: 'Retail Electronics Store',
    description: 'Electronics and home appliances showroom featuring brands like Beko, Sharp, LG, La Germania.',
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
  '4X7veq8Dsye': {
    spaceId: '4X7veq8Dsye',
    spaceName: 'مركز EAAC التدريبي (EAAC Training Center)',
    spaceType: 'Training Center',
    description: 'Professional training center with meeting rooms, training halls, and modern facilities.',
    sections: [
      'Reception Area: Welcome desk and waiting area',
      'Main Training Hall: Large capacity training room',
      'Meeting Room (Scan 10): Conference room with TV and whiteboard',
      'Computer Lab: Equipped with workstations',
      'Break Room: Refreshment area',
      'Administrative Offices: Staff offices'
    ],
    facilities: ['Conference Room with TV', 'Whiteboard', 'Projector', 'High-speed WiFi'],
    personality: 'professional training coordinator',
    specialFeatures: {
      liveStream: {
        enabled: true,
        location: 'Meeting Room (Scan 10)',
        sweepNumber: 10,
        description: 'The meeting room features a large TV screen for live meetings.'
      }
    }
  }
};

const DEFAULT_SPACE_CONFIG = SPACE_CONFIGS['J9fEBnyKuiv'];

class GeminiService {
  private model: GenerativeModel;
  private sessions: Map<string, GeminiSession>;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.sessions = new Map();
  }

  private buildSystemPrompt(spaceConfig: SpaceConfig = DEFAULT_SPACE_CONFIG): string {
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
- Description: ${knownConfig.specialFeatures.liveStream.description}`;
    }

    return `You are an intelligent virtual tour assistant for a Matterport 3D space.

=== YOUR ROLE ===
You are a ${knownConfig.personality || 'friendly guide'} helping users explore this space.

=== SPACE INFORMATION ===
Space ID: ${knownConfig.spaceId}
Name: ${knownConfig.spaceName}
Type: ${knownConfig.spaceType}
Description: ${knownConfig.description}

=== SECTIONS ===
${sectionsText}

=== ${isTrainingCenter ? 'FACILITIES' : 'BRANDS'} ===
${facilitiesText}
${specialFeaturesText}

=== RESPONSE FORMAT ===
Include action commands when appropriate:
- [NAV:sweepId] - Navigate to a viewpoint
- [ROTATE:left:45] or [ROTATE:right:90] - Turn camera
- [HIGHLIGHT:tagId] - Highlight a point of interest
- [TOUR:start] - Begin guided tour
- [MEASURE:show] - Activate measurement mode
- [FLOOR:up] or [FLOOR:down] - Change floors

=== COMMUNICATION STYLE ===
- Be conversational and helpful
- Use spatial language: "to your left", "behind you"
- Be concise but informative
- Write in plain text only - NO markdown`;
  }

  private buildSpatialContext(spatial: SpatialData | null): string {
    if (!spatial) return 'No spatial data available.';

    const { position, rotation, currentFloor, currentSweep, nearbyTags, lookingAt } = spatial;

    let context = `
=== CURRENT USER CONTEXT ===
Position: X=${position?.x?.toFixed(2) || 0}, Y=${position?.y?.toFixed(2) || 0}, Z=${position?.z?.toFixed(2) || 0}
Viewing Angle: Horizontal=${rotation?.y?.toFixed(1) || 0}°, Vertical=${rotation?.x?.toFixed(1) || 0}°
Current Floor: ${currentFloor?.name || 'Ground Floor'}
Current Viewpoint: ${currentSweep?.id || 'Unknown'}`;

    if (nearbyTags && nearbyTags.length > 0) {
      context += `\nNearby Points of Interest: ${nearbyTags.map(t => t.label || t.id).join(', ')}`;
    }

    if (lookingAt) {
      context += `\nCurrently Looking At: ${lookingAt}`;
    }

    return context;
  }

  async initializeSession(sessionId: string, spaceConfig: SpaceConfig | null = null): Promise<{
    greeting: string;
    capabilities: { canNavigate: boolean; canMeasure: boolean; canTour: boolean; canHighlight: boolean };
  }> {
    const config = spaceConfig || DEFAULT_SPACE_CONFIG;
    
    this.sessions.set(sessionId, {
      spaceConfig: config,
      history: [],
      tourState: null,
      createdAt: Date.now(),
    });

    const greeting = `Welcome to ${config.spaceName}! 

I'm your virtual tour assistant. I can help you:

→ Explore - Navigate through the space
→ Learn - Get information about what you're seeing  
→ Measure - Find dimensions and distances
→ Tour - Take a guided walkthrough

What would you like to do?`;

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

  async chat(
    sessionId: string,
    userMessage: string,
    spatialData: SpatialData | null,
    tourData: TourData | null = null
  ): Promise<ChatResponse> {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      await this.initializeSession(sessionId);
      session = this.sessions.get(sessionId);
    }

    if (!session) {
      throw new Error('Failed to initialize session');
    }

    const systemPrompt = this.buildSystemPrompt(session.spaceConfig);
    const spatialContext = this.buildSpatialContext(spatialData);

    const historyText = session.history
      .slice(-10)
      .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      .join('\n');

    let tourContext = '';
    if (tourData) {
      const sweepList = tourData.sweeps?.slice(0, 20).map(s => s.id).join(', ') || 'None';
      const floorList = tourData.floors?.map(f => `${f.name || f.id} (${f.id})`).join(', ') || 'Single floor';
      const tagList = tourData.tags?.map(t => `${t.label || 'Tag'} (${t.id})`).join(', ') || 'None';
      
      tourContext = `
=== SPACE DATA ===
Model ID: ${tourData.modelId || 'Unknown'}
Viewpoints: ${tourData.sweeps?.length || 0} (${sweepList})
Floors: ${floorList}
Tags: ${tagList}`;
    }

    const fullPrompt = `${systemPrompt}

${tourContext}

${spatialContext}

=== CONVERSATION HISTORY ===
${historyText || 'No previous messages'}

=== USER MESSAGE ===
${userMessage}

Respond helpfully. Include action commands when appropriate.`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const rawResponse = result.response.text();
      const parsed = this.parseResponse(rawResponse);

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

  private parseResponse(rawResponse: string): { message: string; actions: ChatAction[] } {
    const actions: ChatAction[] = [];
    let message = rawResponse;

    const navMatches = rawResponse.matchAll(/\[NAV:([^\]]+)\]/g);
    for (const match of navMatches) {
      actions.push({ type: 'NAVIGATE', sweepId: match[1] });
      message = message.replace(match[0], '');
    }

    const rotateMatches = rawResponse.matchAll(/\[ROTATE:(\w+):(\d+)\]/g);
    for (const match of rotateMatches) {
      actions.push({ type: 'ROTATE', direction: match[1], degrees: parseInt(match[2]) });
      message = message.replace(match[0], '');
    }

    const highlightMatches = rawResponse.matchAll(/\[HIGHLIGHT:([^\]]+)\]/g);
    for (const match of highlightMatches) {
      actions.push({ type: 'HIGHLIGHT_TAG', tagId: match[1] });
      message = message.replace(match[0], '');
    }

    const tourMatches = rawResponse.matchAll(/\[TOUR:(\w+)\]/g);
    for (const match of tourMatches) {
      actions.push({ type: 'TOUR_CONTROL', action: match[1] });
      message = message.replace(match[0], '');
    }

    const measureMatches = rawResponse.matchAll(/\[MEASURE:(\w+)\]/g);
    for (const match of measureMatches) {
      actions.push({ type: 'SHOW_MEASUREMENT', action: match[1] });
      message = message.replace(match[0], '');
    }

    const floorMatches = rawResponse.matchAll(/\[FLOOR:(\w+)\]/g);
    for (const match of floorMatches) {
      actions.push({ type: 'CHANGE_FLOOR', direction: match[1] });
      message = message.replace(match[0], '');
    }

    return { message: message.trim(), actions };
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export default new GeminiService();
