// Format coordinate to 2 decimal places
export const formatCoord = (val: number | undefined): string => val?.toFixed(2) || '0.00';

// Format timestamp to readable time
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Get compass direction from rotation Y value
export const getCompassDirection = (rotationY: number): string => {
  const directions = [
    { min: -22.5, max: 22.5, dir: 'N' },
    { min: 22.5, max: 67.5, dir: 'NE' },
    { min: 67.5, max: 112.5, dir: 'E' },
    { min: 112.5, max: 157.5, dir: 'SE' },
    { min: 157.5, max: 180, dir: 'S' },
    { min: -180, max: -157.5, dir: 'S' },
    { min: -157.5, max: -112.5, dir: 'SW' },
    { min: -112.5, max: -67.5, dir: 'W' },
    { min: -67.5, max: -22.5, dir: 'NW' },
  ];
  
  for (const { min, max, dir } of directions) {
    if (rotationY >= min && rotationY < max) return dir;
  }
  return 'N';
};

// Extract YouTube video ID from URL
export const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Clamp a number between min and max
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// Generate a unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Deep clone an object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if value is empty (null, undefined, empty string, empty array, empty object)
export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// Safely parse JSON with fallback
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

// Copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
