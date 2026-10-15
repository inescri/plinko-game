/**
 * Canister/network config, read from Vite env. Set in `packages/frontend/.env`
 * (see `.env.example`); dfx writes canister ids to the root `.env` on deploy.
 */

/**
 * The one Odin token the game accepts for deposits and bets. The canister is
 * token-agnostic (balances are keyed per token), so this is a frontend
 * policy: deposits are restricted to it and the game always plays in it.
 * Withdrawals still list every internal balance so nothing gets stranded.
 */
export const GAME_TOKEN_ID = import.meta.env.VITE_GAME_TOKEN_ID ?? "btc";

/** The app canister's principal: ICRC-2 spender and actor target. */
export const APP_CANISTER_ID = import.meta.env.VITE_APP_CANISTER_ID ?? "";

/** dfx network: `local` (default) uses a local replica; `ic` is mainnet. */
export const DFX_NETWORK = import.meta.env.VITE_DFX_NETWORK ?? "local";

export const IS_LOCAL = DFX_NETWORK !== "ic";

/** Replica/boundary host. Local replica by default, mainnet boundary on `ic`. */
export const IC_HOST =
  import.meta.env.VITE_IC_HOST ??
  (IS_LOCAL ? "http://127.0.0.1:4943" : "https://icp-api.io");
