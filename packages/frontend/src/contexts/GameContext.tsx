import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Risk, Rows } from "@plinko/shared";
import type { TokenInfo } from "../lib/amounts.ts";

export type { Risk, Rows };

/**
 * Game state. Every amount is a `bigint` in the token's base units; the
 * canister is the source of truth and `balance` mirrors the caller's
 * internal balance for `token` (optimistically debited while a bet is in
 * flight, then replaced by the canister's answer).
 */
export interface GameState {
  token: TokenInfo | null;
  balance: bigint;
  bet: bigint;
  /** Largest bet the house bankroll can cover for the current table. */
  maxBet: bigint;
  risk: Risk;
  rows: Rows;
  lastWin: { multiplierX100: number; payout: bigint } | null;
  /** Bets sent to the canister whose result has not arrived yet. */
  inFlight: number;
  playError: string | null;
}

export type GameAction =
  | { type: "SET_TOKEN"; payload: TokenInfo | null }
  | { type: "SET_BALANCE"; payload: bigint }
  | { type: "SET_BET"; payload: bigint }
  | { type: "SET_MAX_BET"; payload: bigint }
  | { type: "SET_RISK"; payload: Risk }
  | { type: "SET_ROWS"; payload: Rows }
  | { type: "SET_LAST_WIN"; payload: GameState["lastWin"] }
  | { type: "BET_STARTED"; payload: bigint }
  | { type: "BET_SETTLED"; payload: bigint }
  | { type: "BET_FAILED"; payload: { bet: bigint; error: string } }
  | { type: "CLEAR_PLAY_ERROR" };

const GameStateContext = createContext<GameState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

const initialState: GameState = {
  token: null,
  balance: 0n,
  bet: 0n,
  maxBet: 0n,
  risk: "low",
  rows: 14,
  lastWin: null,
  inFlight: 0,
  playError: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_TOKEN":
      if (action.payload?.id === state.token?.id) return state;
      return {
        ...state,
        token: action.payload,
        balance: 0n,
        bet: 0n,
        maxBet: 0n,
        lastWin: null,
        playError: null,
      };
    case "SET_BALANCE":
      return { ...state, balance: action.payload };
    case "SET_BET":
      return { ...state, bet: action.payload };
    case "SET_MAX_BET":
      return { ...state, maxBet: action.payload };
    case "SET_RISK":
      return { ...state, risk: action.payload };
    case "SET_ROWS":
      return { ...state, rows: action.payload };
    case "SET_LAST_WIN":
      return { ...state, lastWin: action.payload };
    case "BET_STARTED":
      return {
        ...state,
        balance: state.balance - action.payload,
        inFlight: state.inFlight + 1,
        playError: null,
      };
    case "BET_SETTLED":
      return {
        ...state,
        balance: action.payload,
        inFlight: Math.max(0, state.inFlight - 1),
      };
    case "BET_FAILED":
      return {
        ...state,
        balance: state.balance + action.payload.bet,
        inFlight: Math.max(0, state.inFlight - 1),
        playError: action.payload.error,
      };
    case "CLEAR_PLAY_ERROR":
      return { ...state, playError: null };
    default:
      return state;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}

export function useGameState(): GameState {
  const ctx = useContext(GameStateContext);
  if (ctx === null)
    throw new Error("useGameState must be used within GameProvider");
  return ctx;
}

export function useGameDispatch(): Dispatch<GameAction> {
  const ctx = useContext(GameDispatchContext);
  if (ctx === null)
    throw new Error("useGameDispatch must be used within GameProvider");
  return ctx;
}
