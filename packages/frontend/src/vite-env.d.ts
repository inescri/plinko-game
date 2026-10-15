/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ODIN_APP_NAME?: string;
  readonly VITE_ODIN_ENV?: "prod" | "staging" | "dev" | "local";
  readonly VITE_APP_CANISTER_ID?: string;
  readonly VITE_GAME_TOKEN_ID?: string;
  readonly VITE_HOUSE_ADMINS?: string;
  readonly VITE_DFX_NETWORK?: string;
  readonly VITE_IC_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
