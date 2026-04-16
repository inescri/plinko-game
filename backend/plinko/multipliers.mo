import Array "mo:base/Array";
import Types "types";

module {
  // Multiplier tables indexed by slot position.
  // Symmetric arrays — edges pay high, center pays low.
  // Must match the frontend constants.js exactly.

  let low8  : [Float] = [6.0, 3.0, 1.3, 0.7, 0.5, 0.7, 1.3, 3.0, 6.0];
  let low10 : [Float] = [10.0, 4.0, 1.8, 1.2, 0.8, 0.4, 0.8, 1.2, 1.8, 4.0, 10.0];
  let low12 : [Float] = [14.0, 5.0, 2.5, 1.8, 1.2, 0.7, 0.4, 0.7, 1.2, 1.8, 2.5, 5.0, 14.0];
  let low14 : [Float] = [12.0, 6.0, 3.3, 2.0, 1.5, 1.0, 0.8, 0.5, 0.8, 1.0, 1.5, 2.0, 3.3, 6.0, 12.0];
  let low16 : [Float] = [24.0, 13.0, 3.5, 2.4, 1.8, 1.3, 1.0, 0.8, 0.6, 0.8, 1.0, 1.3, 1.8, 2.4, 3.5, 13.0, 24.0];

  let med8  : [Float] = [13.0, 3.0, 1.3, 0.7, 0.3, 0.7, 1.3, 3.0, 13.0];
  let med10 : [Float] = [24.0, 5.5, 2.2, 1.3, 0.6, 0.3, 0.6, 1.3, 2.2, 5.5, 24.0];
  let med12 : [Float] = [38.0, 11.0, 4.0, 1.9, 1.0, 0.6, 0.4, 0.6, 1.0, 1.9, 4.0, 11.0, 38.0];
  let med14 : [Float] = [71.0, 19.0, 8.0, 4.0, 1.6, 0.8, 0.5, 0.4, 0.5, 0.8, 1.6, 4.0, 8.0, 19.0, 71.0];
  let med16 : [Float] = [135.0, 50.0, 11.0, 5.5, 3.0, 1.6, 0.9, 0.5, 0.2, 0.5, 0.9, 1.6, 3.0, 5.5, 11.0, 50.0, 135.0];

  let high8  : [Float] = [29.0, 4.0, 1.3, 0.3, 0.3, 0.3, 1.3, 4.0, 29.0];
  let high10 : [Float] = [80.0, 9.5, 2.8, 0.8, 0.4, 0.1, 0.4, 0.8, 2.8, 9.5, 80.0];
  let high12 : [Float] = [185.0, 25.0, 8.0, 1.8, 0.6, 0.2, 0.3, 0.2, 0.6, 1.8, 8.0, 25.0, 185.0];
  let high14 : [Float] = [540.0, 72.0, 15.0, 3.8, 1.3, 0.5, 0.3, 0.3, 0.3, 0.5, 1.3, 3.8, 15.0, 72.0, 540.0];
  let high16 : [Float] = [1000.0, 140.0, 28.0, 9.5, 4.0, 1.5, 0.2, 0.2, 0.3, 0.2, 0.2, 1.5, 4.0, 9.5, 28.0, 140.0, 1000.0];

  public func getTable(risk : Types.Risk, rows : Nat) : ?[Float] {
    switch (risk, rows) {
      case (#low,    8)  { ?low8 };
      case (#low,   10)  { ?low10 };
      case (#low,   12)  { ?low12 };
      case (#low,   14)  { ?low14 };
      case (#low,   16)  { ?low16 };
      case (#medium,  8) { ?med8 };
      case (#medium, 10) { ?med10 };
      case (#medium, 12) { ?med12 };
      case (#medium, 14) { ?med14 };
      case (#medium, 16) { ?med16 };
      case (#high,   8)  { ?high8 };
      case (#high,  10)  { ?high10 };
      case (#high,  12)  { ?high12 };
      case (#high,  14)  { ?high14 };
      case (#high,  16)  { ?high16 };
      case _              { null };
    };
  };

  public func getMultiplier(risk : Types.Risk, rows : Nat, slotIndex : Nat) : ?Float {
    switch (getTable(risk, rows)) {
      case (?table) {
        if (slotIndex < table.size()) {
          ?table[slotIndex];
        } else {
          null;
        };
      };
      case null { null };
    };
  };
};
