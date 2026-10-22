import { OdinConnect } from "odin-connect";

/**
 * Odin environments this app supports. Kept as a runtime array so the value
 * from `.env` can be validated; the `satisfies` clause makes the build fail if
 * the SDK's environment union ever changes.
 */
const ODIN_ENVS = [
  "prod",
  "staging",
  "dev",
  "local",
  "legacy",
] as const satisfies readonly OdinConnect["currentEnv"][];
export type OdinEnv = (typeof ODIN_ENVS)[number];

/**
 * Validate `VITE_ODIN_ENV`. A typo here would otherwise reach the SDK
 * unchecked and surface later as `new URL('undefined/...')` inside
 * `connect()`, so fail loudly at module load instead.
 */
export function parseOdinEnv(raw: string | undefined): OdinEnv {
  if (raw === undefined || raw === "") return "prod";
  if ((ODIN_ENVS as readonly string[]).includes(raw)) return raw as OdinEnv;
  throw new Error(
    `VITE_ODIN_ENV="${raw}" is not a valid Odin environment. ` +
      `Expected one of: ${ODIN_ENVS.join(", ")}`,
  );
}

/**
 * App name + environment shown on the Odin approval page. Configurable via
 * Vite env vars (see `.env.example`) so a deployment can point at prod/dev
 * without code changes. The env must match the Odin ledger the canister was
 * deployed with (`getOdinLedger`).
 */
const APP_NAME = import.meta.env.VITE_ODIN_APP_NAME ?? "Plinko";
export const APP_ENV = parseOdinEnv(import.meta.env.VITE_ODIN_ENV);

/**
 * Odin web app origin per environment. Mirrors the SDK's internal map (not
 * exported by odin-connect) so "buy on Odin" links land on the same site the
 * wallet session belongs to: a dev token only exists on dev.odin.fun.
 */
const ODIN_SITE_URLS: Record<OdinEnv, string> = {
  prod: "https://odin.fun",
  staging: "https://staging.odin.fun",
  dev: "https://dev.odin.fun",
  local: "http://localhost:5173",
  legacy: "https://legacy.odin.fun",
};

/** Odin token page for `tokenId` on the configured environment. */
export function odinTokenUrl(tokenId: string, env: OdinEnv = APP_ENV): string {
  return `${ODIN_SITE_URLS[env]}/token/${encodeURIComponent(tokenId)}`;
}

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
