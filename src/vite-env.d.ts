/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_STORE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
