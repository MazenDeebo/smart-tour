/**
 * Space Configurations for Matterport Virtual Tours
 * Each space has its own settings, AI prompts, and embedded content
 */

export const SPACES = {
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
    language: 'ar-en', // Bilingual
    embeds: [] // No embedded content
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
    
    // HTML Embeds for this space
    embeds: [
      {
        id: 'teams-meeting-room',
        type: 'teams-stream',
        name: 'Teams Live Stream',
        description: 'Microsoft Teams live meeting in the conference room',
        sweepId: 'scan10', // Will be updated with actual sweep ID
        position: { x: 0, y: 1.5, z: -2 }, // Position on the TV/wall
        rotation: { x: 0, y: 0, z: 0 },
        size: { width: 1.8, height: 1.0 },
        defaultUrl: '', // Will be set when meeting starts
        placeholder: true
      }
    ],

    // Sweep configurations for EAAC
    sweepConfig: {
      meetingRoom: {
        name: 'Meeting Room',
        scanNumber: 10,
        sweepId: null, // Will be populated from SDK
        features: ['teams-stream', 'whiteboard', 'tv-display']
      }
    }
  }
};

/**
 * Get space configuration by ID
 */
export function getSpaceConfig(spaceId) {
  return SPACES[spaceId] || null;
}

/**
 * Get space configuration by model ID
 */
export function getSpaceByModelId(modelId) {
  return Object.values(SPACES).find(space => space.modelId === modelId) || null;
}

/**
 * Get all available spaces
 */
export function getAllSpaces() {
  return Object.values(SPACES);
}

/**
 * Default space
 */
export const DEFAULT_SPACE = SPACES.awni;

export default SPACES;
