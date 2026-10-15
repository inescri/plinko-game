/** Odin's BTC token id — the asset the flat ledger fee is denominated in. */
export const BTC_TOKEN_ID = "btc";

/**
 * Flat BTC fee the Odin ledger charges the sender per transfer, in
 * millisatoshis. Mirrors `ODIN_BTC_FEE` in `packages/canister/src/odin.ts`.
 */
export const ODIN_BTC_FEE = 100_000n;

/**
 * What the withdrawer approves: the fee the canister pulls to fund the
 * outbound send, plus the fee the ledger charges on that pull itself.
 */
export const WITHDRAW_FEE_APPROVAL = ODIN_BTC_FEE * 2n;

export const WITHDRAW_FEE_SATS = Number(WITHDRAW_FEE_APPROVAL / 1000n);
