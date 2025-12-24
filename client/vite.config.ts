import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: mode === 'production' ? '/smart-tour/' : '/',
    server: {
      port: 3000,
      strictPort: true,
      open: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    define: {
      'process.env': {
        REACT_APP_SERVER_URL: JSON.stringify(env.VITE_SERVER_URL || 'http://localhost:3001'),
        REACT_APP_MATTERPORT_SDK_KEY: JSON.stringify(env.VITE_MATTERPORT_SDK_KEY || ''),
        REACT_APP_DEFAULT_MODEL_ID: JSON.stringify(env.VITE_DEFAULT_MODEL_ID || ''),
      }
    }
  };
});
