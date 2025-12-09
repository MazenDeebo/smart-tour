import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true, // Fail if port 3000 is not available
    open: true,
  },
  define: {
    'process.env': {
      REACT_APP_SERVER_URL: JSON.stringify('http://localhost:3001'),
      REACT_APP_MATTERPORT_SDK_KEY: JSON.stringify('bnx9rtn9umenhf4ym8bngu7ud'),
      REACT_APP_DEFAULT_MODEL_ID: JSON.stringify('J9fEBnyKuiv'),
    }
  }
});
