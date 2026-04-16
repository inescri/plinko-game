import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Random "mo:base/Random";
import Result "mo:base/Result";
import Types "types";
import Multipliers "multipliers";

actor PlinkoBackend {

  type Risk = Types.Risk;
  type BetRequest = Types.BetRequest;
  type BetResult = Types.BetResult;

  let validRows : [Nat] = [8, 10, 12, 14, 16];

  func isValidRows(rows : Nat) : Bool {
    for (r in validRows.vals()) {
      if (r == rows) return true;
    };
    false;
  };

  /// Place a bet: generates a random path and returns the result.
  public func placeBet(req : BetRequest) : async Result.Result<BetResult, Text> {
    if (not isValidRows(req.rows)) {
      return #err("Invalid rows: must be 8, 10, 12, 14, or 16");
    };

    // Get cryptographic randomness from the IC subnet
    let entropy = await Random.blob();
    let finite = Random.Finite(entropy);

    // Generate one boolean per row (true = right, false = left)
    let pathBuf = Array.init<Bool>(req.rows, false);
    var slotIndex : Nat = 0;
    var i : Nat = 0;

    while (i < req.rows) {
      switch (finite.coin()) {
        case (?bit) {
          pathBuf[i] := bit;
          if (bit) { slotIndex += 1 };
          i += 1;
        };
        case null {
          // Entropy exhausted (extremely unlikely: 256 bits available, max 16 needed)
          // Return error rather than silently producing biased results
          return #err("Randomness source exhausted");
        };
      };
    };

    let path = Array.freeze(pathBuf);

    // Look up multiplier
    switch (Multipliers.getMultiplier(req.risk, req.rows, slotIndex)) {
      case (?mult) {
        #ok({
          path = path;
          slotIndex = slotIndex;
          multiplier = mult;
        });
      };
      case null {
        #err("Invalid risk/rows/slot combination");
      };
    };
  };

  /// Query the multiplier table for a given risk and row count.
  public query func getMultipliers(risk : Risk, rows : Nat) : async Result.Result<[Float], Text> {
    if (not isValidRows(rows)) {
      return #err("Invalid rows: must be 8, 10, 12, 14, or 16");
    };
    switch (Multipliers.getTable(risk, rows)) {
      case (?table) { #ok(table) };
      case null { #err("Unknown risk/rows combination") };
    };
  };
};
