import { ODIN_BTC_FEE } from "@plinko/shared";

/**
 * What the withdrawer approves: the fee the canister pulls to fund the
 * outbound send, plus the fee the ledger charges on that pull itself.
 * `ODIN_BTC_FEE` itself lives in `@plinko/shared`, next to the canister's use.
 */
export const WITHDRAW_FEE_APPROVAL = ODIN_BTC_FEE * 2n;

export const WITHDRAW_FEE_SATS = Number(WITHDRAW_FEE_APPROVAL / 1000n);
