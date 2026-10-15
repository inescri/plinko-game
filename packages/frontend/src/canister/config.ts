/**
 * Canister config, read from Vite env. Set in `packages/frontend/.env` (see
 * `.env.example`); once the app canister exists, dfx writes its id to the
 * root `.env` on deploy.
 */

/** The app canister's principal: ICRC-2 spender for deposits. */
export const APP_CANISTER_ID = import.meta.env.VITE_APP_CANISTER_ID ?? "";
