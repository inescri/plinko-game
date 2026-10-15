/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ODIN_APP_NAME?: string;
  readonly VITE_ODIN_ENV?: "prod" | "dev" | "local";
  readonly VITE_APP_CANISTER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
