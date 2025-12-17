/**
 * Environment Configuration
 * This file reads environment variables safely
 * For GitHub Pages deployment, you'll need to set these in GitHub Secrets
 */

const config = {
  // Matterport Configuration
  matterportSdkKey: import.meta.env.VITE_MATTERPORT_SDK_KEY || '',
  matterportModelId: import.meta.env.VITE_MATTERPORT_MODEL_ID || '',
  
  // Server Configuration
  serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  
  // Google Gemini AI
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  
  // MongoDB
  mongodbUri: import.meta.env.VITE_MONGODB_URI || '',
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Validate required environment variables in production
if (config.isProduction) {
  const requiredVars = [
    { key: 'matterportSdkKey', name: 'VITE_MATTERPORT_SDK_KEY' },
    { key: 'matterportModelId', name: 'VITE_MATTERPORT_MODEL_ID' },
  ];
  
  const missing = requiredVars.filter(v => !config[v.key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.map(v => v.name).join(', '));
    console.error('Please configure these in GitHub repository secrets for deployment.');
  }
}

export default config;
