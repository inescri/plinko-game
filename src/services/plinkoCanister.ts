import { Actor, HttpAgent } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import type { Risk } from "../contexts/GameContext.tsx";

// Canister ID — update after deployment
const CANISTER_ID =
  import.meta.env.VITE_PLINKO_CANISTER_ID || "sfgyi-iyaaa-aaaam-qepyq-cai";

const IC_HOST = import.meta.env.VITE_IC_HOST || "https://icp0.io";

// Candid IDL factory matching backend/plinko/main.mo
// This will be replaced by auto-generated declarations after `dfx generate`
const idlFactory: IDL.InterfaceFactory = ({ IDL: I }) => {
  const RiskType = I.Variant({
    low: I.Null,
    medium: I.Null,
    high: I.Null,
  });

  const BetRequest = I.Record({
    risk: RiskType,
    rows: I.Nat,
  });

  const BetResult = I.Record({
    path: I.Vec(I.Bool),
    slotIndex: I.Nat,
    multiplier: I.Float64,
  });

  return I.Service({
    placeBet: I.Func(
      [BetRequest],
      [I.Variant({ ok: BetResult, err: I.Text })],
      [],
    ),
    getMultipliers: I.Func(
      [RiskType, I.Nat],
      [I.Variant({ ok: I.Vec(I.Float64), err: I.Text })],
      ["query"],
    ),
  });
};

export interface PlaceBetResult {
  path: boolean[];
  slotIndex: number;
  multiplier: number;
}

function riskToVariant(risk: Risk): Record<string, null> {
  return { [risk]: null };
}

let cachedAgent: HttpAgent | null = null;

async function getAgent(): Promise<HttpAgent> {
  if (!cachedAgent) {
    cachedAgent = await HttpAgent.create({ host: IC_HOST });
    // When developing locally against a replica, fetch root key
    if (IC_HOST.includes("localhost") || IC_HOST.includes("127.0.0.1")) {
      await cachedAgent.fetchRootKey();
    }
  }
  return cachedAgent;
}

async function getActor() {
  const agent = await getAgent();
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });
}

export async function placeBet(
  risk: Risk,
  rows: number,
): Promise<PlaceBetResult> {
  const actor = await getActor();
  const response = (await actor.placeBet({
    risk: riskToVariant(risk),
    rows: BigInt(rows),
  })) as
    | { ok: { path: boolean[]; slotIndex: bigint; multiplier: number } }
    | { err: string };

  if ("err" in response) {
    throw new Error(response.err);
  }

  const result = response.ok;
  return {
    path: Array.from(result.path),
    slotIndex: Number(result.slotIndex),
    multiplier: result.multiplier,
  };
}

export async function getMultipliers(
  risk: Risk,
  rows: number,
): Promise<number[]> {
  const actor = await getActor();
  const response = (await actor.getMultipliers(
    riskToVariant(risk),
    BigInt(rows),
  )) as { ok: number[] } | { err: string };

  if ("err" in response) {
    throw new Error(response.err);
  }

  return Array.from(response.ok);
}
