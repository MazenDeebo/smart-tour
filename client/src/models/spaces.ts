/**
 * Space Configurations for Matterport Virtual Tours
 * Each space has its own settings, AI prompts, and embedded content
 */

import type { Position, Rotation } from '../types.d';

// Embed configuration type
interface EmbedConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  sweepId: string;
  position: Position;
  rotation: Rotation;
  size: { width: number; height: number };
  defaultUrl: string;
  placeholder: boolean;
}

// Sweep configuration type
interface SweepConfigItem {
  name: string;
  scanNumber: number;
  sweepId: string | null;
  features: string[];
}

// Extended space config for this file
interface ExtendedSpaceConfig {
  id: string;
  modelId: string;
  name: string;
  nameEn: string;
  type: string;
  description: string;
  features: string[];
  sections: string[];
  brands?: string[];
  facilities?: string[];
  aiPersonality: string;
  language: string;
  embeds: EmbedConfig[];
  sweepConfig?: Record<string, SweepConfigItem>;
}

type SpacesMap = Record<string, ExtendedSpaceConfig>;

export const SPACES: SpacesMap = {
  // Awni Electronics Store
  awni: {
    id: 'awni',
    modelId: 'J9fEBnyKuiv',
    name: 'مؤسسة عوني للاجهزه الكهربائي',
    nameEn: 'Awni Electronics Store',
    type: 'retail',
    description: 'Electronics and home appliances showroom featuring brands like Beko, Sharp, LG, La Germania',
    features: ['chatbot', 'measurements', 'guided-tour', 'video-call'],
    sections: [
      'Main Showroom',
      'Electronics Section',
      'Kitchen Appliances',
      'Small Appliances',
      'Display Areas'
    ],
    brands: ['Beko', 'Sharp', 'LG', 'La Germania'],
    aiPersonality: 'helpful sales assistant',
    language: 'ar-en',
    embeds: []
  },

  // EAAC Training Center
  eaac: {
    id: 'eaac',
    modelId: '4X7veq8Dsye',
    name: 'مركز EAAC التدريبي - فرع الرياضة',
    nameEn: 'EAAC Training Center - Sporting Branch',
    type: 'training-center',
    description: 'Professional training center with meeting rooms, training halls, and modern facilities for corporate training and workshops',
    features: ['chatbot', 'measurements', 'guided-tour', 'video-call', 'live-stream'],
    sections: [
      'Reception Area',
      'Main Training Hall',
      'Meeting Room (Scan 10)',
      'Computer Lab',
      'Break Room',
      'Administrative Offices'
    ],
    facilities: [
      'Conference Room with TV',
      'Whiteboard',
      'Projector',
      'High-speed WiFi',
      'Air Conditioning'
    ],
    aiPersonality: 'professional training coordinator',
    language: 'ar-en',
    
    embeds: [
      {
        id: 'teams-meeting-room',
        type: 'teams-stream',
        name: 'Teams Live Stream',
        description: 'Microsoft Teams live meeting in the conference room',
        sweepId: 'scan10',
        position: { x: 0, y: 1.5, z: -2 },
        rotation: { x: 0, y: 0 },
        size: { width: 1.8, height: 1.0 },
        defaultUrl: '',
        placeholder: true
      }
    ],

    sweepConfig: {
      meetingRoom: {
        name: 'Meeting Room',
        scanNumber: 10,
        sweepId: null,
        features: ['teams-stream', 'whiteboard', 'tv-display']
      }
    }
  }
};

/**
 * Get space configuration by ID
 */
export function getSpaceConfig(spaceId: string): ExtendedSpaceConfig | null {
  return SPACES[spaceId] || null;
}

/**
 * Get space configuration by model ID
 */
export function getSpaceByModelId(modelId: string): ExtendedSpaceConfig | null {
  return Object.values(SPACES).find(space => space.modelId === modelId) || null;
}

/**
 * Get all available spaces
 */
export function getAllSpaces(): ExtendedSpaceConfig[] {
  return Object.values(SPACES);
}

/**
 * Default space
 */
export const DEFAULT_SPACE = SPACES.awni;

export default SPACES;
