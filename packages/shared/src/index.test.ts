import { describe, expect, it } from "vitest";
import {
  MULTIPLIERS_X100,
  RISKS,
  ROWS,
  houseExposure,
  maxBetForHouse,
  maxMultiplierX100,
  multiplierX100,
  payoutFor,
  slotFromPath,
} from "./index";

function binomial(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return result;
}

describe("MULTIPLIERS_X100", () => {
  for (const risk of RISKS) {
    for (const rows of ROWS) {
      const table = MULTIPLIERS_X100[risk][rows];
      it(`${risk}/${rows} has rows + 1 symmetric integer entries`, () => {
        expect(table).toHaveLength(rows + 1);
        for (let i = 0; i < table.length; i++) {
          expect(Number.isInteger(table[i])).toBe(true);
          expect(table[i]).toBe(table[table.length - 1 - i]);
        }
      });
      it(`${risk}/${rows} returns 95-99% to the player under a fair walk`, () => {
        let ev = 0;
        for (let slot = 0; slot <= rows; slot++) {
          ev += (table[slot] / 100) * (binomial(rows, slot) / 2 ** rows);
        }
        expect(ev).toBeGreaterThan(0.95);
        expect(ev).toBeLessThan(0.99);
      });
    }
  }
});

describe("slotFromPath", () => {
  it("counts right steps", () => {
    expect(slotFromPath([])).toBe(0);
    expect(slotFromPath([false, false, false])).toBe(0);
    expect(slotFromPath([true, false, true])).toBe(2);
    expect(slotFromPath(new Array(16).fill(true))).toBe(16);
  });
});

describe("multiplierX100", () => {
  it("reads the table and rejects out-of-range slots", () => {
    expect(multiplierX100("low", 8, 0)).toBe(600);
    expect(multiplierX100("high", 16, 8)).toBe(30);
    expect(() => multiplierX100("low", 8, 9)).toThrow(/out of range/);
  });
  it("maxMultiplierX100 is the edge value", () => {
    expect(maxMultiplierX100("high", 16)).toBe(100000);
    expect(maxMultiplierX100("low", 8)).toBe(600);
  });
});

describe("payoutFor", () => {
  it("floors to base units", () => {
    expect(payoutFor(100n, 130)).toBe(130n);
    expect(payoutFor(1n, 130)).toBe(1n);
    expect(payoutFor(1n, 30)).toBe(0n);
    expect(payoutFor(999n, 50)).toBe(499n);
  });
  it("rejects bad multipliers", () => {
    expect(() => payoutFor(1n, 1.5)).toThrow();
    expect(() => payoutFor(1n, -1)).toThrow();
  });
});

describe("house limits", () => {
  it("exposure is top payout minus the bet", () => {
    expect(houseExposure(100n, "high", 16)).toBe(100000n - 100n);
    expect(houseExposure(100n, "low", 8)).toBe(500n);
  });
  it("maxBetForHouse inverts exposure", () => {
    const house = 1_000_000n;
    for (const risk of RISKS) {
      for (const rows of ROWS) {
        const max = maxBetForHouse(house, risk, rows);
        expect(houseExposure(max, risk, rows)).toBeLessThanOrEqual(house);
        expect(houseExposure(max + 1n, risk, rows)).toBeGreaterThan(house);
      }
    }
    expect(maxBetForHouse(0n, "high", 16)).toBe(0n);
  });
});
