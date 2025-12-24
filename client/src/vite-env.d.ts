/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
  readonly VITE_CLIENT_PORT: string;
  readonly VITE_MATTERPORT_SDK_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_MODEL_AWNI: string;
  readonly VITE_MODEL_EAAC: string;
  readonly VITE_DEFAULT_MODEL_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
