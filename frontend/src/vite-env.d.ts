/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clave de la API de Google Maps (ver docs/GOOGLE_MAPS.md). Opcional en desarrollo. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Google Maps llama a esta función cuando la clave no es válida o no está autorizada. */
  gm_authFailure?: () => void;
}
