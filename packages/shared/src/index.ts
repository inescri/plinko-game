/**
 * Plinko game constants and pure helpers shared by the canister (source of
 * truth for payouts) and the frontend (board labels, bet validation).
 *
 * No runtime dependencies: this module must stay importable from an Azle
 * canister, a Vite bundle and plain vitest.
 */

// ── Odin ledger fees ────────────────────────────────────────────────────
// Shared so the canister (which pulls the fee) and the frontend (which
// approves it) can never disagree on the amount.

/** Odin's BTC token id — the asset the flat ledger fee is denominated in. */
export const ODIN_BTC_TOKEN_ID = "btc";

/**
 * Flat BTC fee the Odin ledger charges the SENDER on every transfer, in
 * millisatoshis (1 sat = 1000 millisat → 100 sats). `withdraw` pulls this much
 * BTC from the withdrawer (icrc2_transfer_from) to fund the outbound transfer's
 * own fee, so withdrawals need no maintainer-seeded BTC float.
 *
 * NOTE: pulling BTC is itself a transfer, so the ledger charges the withdrawer a
 * second fee on the pull (debited from the caller's BTC, per ICRC-2). The caller
 * therefore approves >= 2x this value and pays 2x total; the canister nets zero.
 *
 * ⚠️ Verify this constant against the live Odin ledger before mainnet. If it is
 * lower than the real fee, the first withdraw on an empty-float canister traps
 * with error 910; if higher, the canister slowly accumulates a BTC surplus.
 */
export const ODIN_BTC_FEE = 100_000n;

// ── Game tables ─────────────────────────────────────────────────────────

export const RISKS = ["low", "medium", "high"] as const;
export type Risk = (typeof RISKS)[number];

export const ROWS = [8, 10, 12, 14, 16] as const;
export type Rows = (typeof ROWS)[number];

/** Multipliers are stored as integers scaled by this (1.3x → 130). */
export const MULT_SCALE = 100n;

/**
 * Slot multipliers ×100, indexed `[risk][rows][slot]`. Each table has
 * `rows + 1` entries and is symmetric. Slot index = number of "right" steps
 * the ball took, so slot 0 is the leftmost bucket.
 */
export const MULTIPLIERS_X100: Record<Risk, Record<Rows, readonly number[]>> = {
  low: {
    8: [600, 300, 130, 70, 50, 70, 130, 300, 600],
    10: [1000, 400, 180, 120, 80, 40, 80, 120, 180, 400, 1000],
    12: [1400, 500, 250, 180, 120, 70, 40, 70, 120, 180, 250, 500, 1400],
    14: [1200, 600, 330, 200, 150, 100, 80, 50, 80, 100, 150, 200, 330, 600, 1200],
    16: [2400, 1300, 350, 240, 180, 130, 100, 80, 60, 80, 100, 130, 180, 240, 350, 1300, 2400],
  },
  medium: {
    8: [1300, 300, 130, 70, 30, 70, 130, 300, 1300],
    10: [2400, 550, 220, 130, 60, 30, 60, 130, 220, 550, 2400],
    12: [3800, 1100, 400, 190, 100, 60, 40, 60, 100, 190, 400, 1100, 3800],
    14: [7100, 1900, 800, 400, 160, 80, 50, 40, 50, 80, 160, 400, 800, 1900, 7100],
    16: [13500, 5000, 1100, 550, 300, 160, 90, 50, 20, 50, 90, 160, 300, 550, 1100, 5000, 13500],
  },
  high: {
    8: [2900, 400, 130, 30, 30, 30, 130, 400, 2900],
    10: [8000, 950, 280, 80, 40, 10, 40, 80, 280, 950, 8000],
    12: [18500, 2500, 800, 180, 60, 20, 30, 20, 60, 180, 800, 2500, 18500],
    14: [54000, 7200, 1500, 380, 130, 50, 30, 30, 30, 50, 130, 380, 1500, 7200, 54000],
    16: [100000, 14000, 2800, 950, 400, 150, 20, 20, 30, 20, 20, 150, 400, 950, 2800, 14000, 100000],
  },
};

export function isRisk(value: unknown): value is Risk {
  return typeof value === "string" && (RISKS as readonly string[]).includes(value);
}

export function isRows(value: unknown): value is Rows {
  return typeof value === "number" && (ROWS as readonly number[]).includes(value);
}

/** Landing slot for a left/right path: the number of "right" (true) steps. */
export function slotFromPath(path: readonly boolean[]): number {
  let rights = 0;
  for (const step of path) {
    if (step) rights++;
  }
  return rights;
}

export function multiplierX100(risk: Risk, rows: Rows, slot: number): number {
  const table = MULTIPLIERS_X100[risk][rows];
  const value = table[slot];
  if (value === undefined) {
    throw new Error(`slot ${slot} out of range for ${rows} rows`);
  }
  return value;
}

export function maxMultiplierX100(risk: Risk, rows: Rows): number {
  return Math.max(...MULTIPLIERS_X100[risk][rows]);
}

/** Payout for a bet at a given multiplier, rounded down to base units. */
export function payoutFor(bet: bigint, multX100: number): bigint {
  if (!Number.isInteger(multX100) || multX100 < 0) {
    throw new Error("multiplier must be a non-negative integer (x100)");
  }
  return (bet * BigInt(multX100)) / MULT_SCALE;
}

/**
 * The most the house can lose on one bet: the top payout minus the bet
 * itself (which the house keeps when the ball lands anywhere else).
 */
export function houseExposure(bet: bigint, risk: Risk, rows: Rows): bigint {
  const top = payoutFor(bet, maxMultiplierX100(risk, rows));
  return top > bet ? top - bet : 0n;
}

/**
 * Largest bet a house bankroll can cover for a given table: the inverse of
 * `houseExposure`. 0 when the table cannot pay more than the bet.
 */
export function maxBetForHouse(house: bigint, risk: Risk, rows: Rows): bigint {
  const top = BigInt(maxMultiplierX100(risk, rows));
  if (top <= MULT_SCALE) return 0n;
  return (house * MULT_SCALE) / (top - MULT_SCALE);
}
