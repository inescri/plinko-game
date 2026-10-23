import { describe, expect, it } from "vitest";
import {
  HOUSE_OWNER,
  drawPath,
  randomBytesFor,
  randomBytesForMany,
  resolveBet,
  resolveBets,
} from "./game";
import { makeKey, parseKey } from "./ledger";

describe("drawPath", () => {
  it("uses one bit per row, LSB first", () => {
    // 0b00000101 → rows 0 and 2 go right
    expect(drawPath(8, new Uint8Array([0b00000101]))).toEqual([
      true, false, true, false, false, false, false, false,
    ]);
  });
  it("spans two bytes for 16 rows", () => {
    expect(randomBytesFor(16)).toBe(2);
    expect(randomBytesFor(10)).toBe(2);
    expect(randomBytesFor(8)).toBe(1);
    const path = drawPath(16, new Uint8Array([0xff, 0x00]));
    expect(path.slice(0, 8).every(Boolean)).toBe(true);
    expect(path.slice(8).some(Boolean)).toBe(false);
  });
  it("rejects too few bytes", () => {
    expect(() => drawPath(16, new Uint8Array([1]))).toThrow(/random bytes/);
  });
});

describe("resolveBet", () => {
  it("maps the path to a slot and integer payout", () => {
    // all left → slot 0 → low/8 = 6.0x
    const left = resolveBet(1000n, 8, "low", new Uint8Array([0]));
    expect(left.slot).toBe(0);
    expect(left.multiplierX100).toBe(600);
    expect(left.payout).toBe(6000n);
    // four rights → centre slot 4 → low/8 = 0.5x, floored
    const centre = resolveBet(1001n, 8, "low", new Uint8Array([0b00001111]));
    expect(centre.slot).toBe(4);
    expect(centre.multiplierX100).toBe(50);
    expect(centre.payout).toBe(500n);
  });
});

describe("resolveBets", () => {
  it("with one ball equals resolveBet", () => {
    const bytes = new Uint8Array([0b00001111]);
    const batch = resolveBets(1001n, 8, "low", 1, bytes);
    expect(batch.outcomes).toEqual([resolveBet(1001n, 8, "low", bytes)]);
    expect(batch.totalPayout).toBe(500n);
  });
  it("gives each ball its own byte slice and sums payouts", () => {
    // ball 0: all left → slot 0 (6.0x); ball 1: four rights → slot 4 (0.5x);
    // ball 2: all right → slot 8 (6.0x)
    const bytes = new Uint8Array([0b00000000, 0b00001111, 0b11111111]);
    const batch = resolveBets(1000n, 8, "low", 3, bytes);
    expect(batch.outcomes.map((o) => o.slot)).toEqual([0, 4, 8]);
    expect(batch.outcomes.map((o) => o.payout)).toEqual([6000n, 500n, 6000n]);
    expect(batch.totalPayout).toBe(12500n);
  });
  it("needs randomBytesFor(rows) bytes per ball", () => {
    expect(randomBytesForMany(16, 10)).toBe(20);
    expect(randomBytesForMany(8, 3)).toBe(3);
    expect(() => resolveBets(1n, 16, "low", 10, new Uint8Array(19))).toThrow(
      /random bytes/,
    );
    expect(() => randomBytesForMany(8, 0)).toThrow(/count/);
    expect(() => randomBytesForMany(8, 11)).toThrow(/count/);
  });
});

describe("house key", () => {
  it("never parses as a principal-owned key", () => {
    const key = makeKey(HOUSE_OWNER, "btc");
    expect(parseKey(key)).toEqual({ owner: "house", token: "btc" });
    expect(HOUSE_OWNER.includes("-")).toBe(false);
  });
});
