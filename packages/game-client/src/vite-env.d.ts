/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WSS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
