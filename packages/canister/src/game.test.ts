import { describe, expect, it } from "vitest";
import { HOUSE_OWNER, drawPath, randomBytesFor, resolveBet } from "./game";
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

describe("house key", () => {
  it("never parses as a principal-owned key", () => {
    const key = makeKey(HOUSE_OWNER, "btc");
    expect(parseKey(key)).toEqual({ owner: "house", token: "btc" });
    expect(HOUSE_OWNER.includes("-")).toBe(false);
  });
});
