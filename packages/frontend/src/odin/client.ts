import { OdinConnect } from "odin-connect";

type OdinEnv = "prod" | "dev" | "local";

/**
 * App name + environment shown on the Odin approval page. Configurable via
 * Vite env vars (see `.env.example`) so a deployment can point at prod/dev
 * without code changes.
 */
const APP_NAME = import.meta.env.VITE_ODIN_APP_NAME ?? "Plinko";
const APP_ENV = (import.meta.env.VITE_ODIN_ENV ?? "prod") as OdinEnv;

/**
 * The one `OdinConnect` instance for this page load (odin-connect 2.0).
 *
 * Created at module level, not per render: the constructor immediately
 * restores the stored session and, when the page is coming back from an Odin
 * redirect (wallet in-app browsers), reads and verifies that result. Every
 * part of the app reads the outcome from this instance's state store
 * (`odin.subscribe` / `odin.getState`) — see `contexts/WalletContext.tsx`.
 *
 * `mode` is left at the default `"auto"`: popups in normal browsers, a
 * full-page redirect inside wallet in-app browsers (OKX, Xverse, …).
 */
export const odin = new OdinConnect({ name: APP_NAME, env: APP_ENV });
