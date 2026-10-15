import type { ActorMethod } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import type { Principal } from "@dfinity/principal";

/**
 * Hand-maintained Candid interface of the app canister. Must match the
 * decorators in `packages/canister/src/index.ts`. `icrc28_trusted_origins`
 * is left out on purpose: only the Odin signer calls it.
 */
export const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const PlayResult = IDL.Record({
    path: IDL.Vec(IDL.Bool),
    slot: IDL.Nat8,
    multiplier_x100: IDL.Nat32,
    payout: IDL.Nat,
    balance: IDL.Nat,
  });
  return IDL.Service({
    getBalance: IDL.Func([IDL.Text], [IDL.Nat], ["query"]),
    getBalances: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
      ["query"],
    ),
    getHouseBalance: IDL.Func([IDL.Text], [IDL.Nat], ["query"]),
    getOwner: IDL.Func([], [IDL.Opt(IDL.Principal)], ["query"]),
    getMaxBet: IDL.Func([IDL.Text, IDL.Nat8, IDL.Text], [IDL.Nat], ["query"]),
    deposit: IDL.Func([IDL.Text, IDL.Nat], [IDL.Nat], []),
    withdraw: IDL.Func([IDL.Text, IDL.Nat], [IDL.Nat], []),
    fundHouse: IDL.Func([IDL.Text, IDL.Nat], [IDL.Nat], []),
    play: IDL.Func([IDL.Text, IDL.Nat, IDL.Nat8, IDL.Text], [PlayResult], []),
  });
};

export interface PlayResult {
  path: boolean[];
  slot: number;
  multiplier_x100: number;
  payout: bigint;
  balance: bigint;
}

export interface CanisterActor {
  getBalance: ActorMethod<[string], bigint>;
  getBalances: ActorMethod<[], Array<[string, bigint]>>;
  getHouseBalance: ActorMethod<[string], bigint>;
  getOwner: ActorMethod<[], [] | [Principal]>;
  getMaxBet: ActorMethod<[string, number, string], bigint>;
  deposit: ActorMethod<[string, bigint], bigint>;
  withdraw: ActorMethod<[string, bigint], bigint>;
  fundHouse: ActorMethod<[string, bigint], bigint>;
  play: ActorMethod<[string, bigint, number, string], PlayResult>;
}
