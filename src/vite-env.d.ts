/// <reference types="vite/client" />

// Vite가 주입하는 환경변수 타입. import.meta.env.VITE_* 사용을 위해 필요.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_NCP_MAP_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
