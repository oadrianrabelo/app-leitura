/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_GOOGLE_DESKTOP_CLIENT_ID?: string;
  readonly VITE_GOOGLE_DESKTOP_CLIENT_SECRET?: string;
}
