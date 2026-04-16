module {
  public type Risk = {
    #low;
    #medium;
    #high;
  };

  public type BetRequest = {
    risk : Risk;
    rows : Nat;
  };

  public type BetResult = {
    path : [Bool];
    slotIndex : Nat;
    multiplier : Float;
  };
};
