import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Risk, Rows } from "@plinko/shared";
import type { TokenInfo } from "../lib/amounts.ts";
import { clampBallCount, perBallCap } from "../lib/drop.ts";

export type { Risk, Rows };

/** Outcome of one finished drop (every ball of one `playMany` call landed). */
export interface DropSummary {
  count: number;
  totalBet: bigint;
  totalPayout: bigint;
}

/**
 * Game state. Every amount is a `bigint` in the token's base units; the
 * canister is the source of truth and `balance` mirrors the caller's
 * internal balance for `token`. While a drop is in flight the stake is
 * debited optimistically and each payout is added only once its drop has
 * finished animating; the canister's answer is held in `settledBalance`
 * until then, so the display never reveals the result before the balls land.
 */
export interface GameState {
  token: TokenInfo | null;
  balance: bigint;
  /**
   * Latest balance returned by the canister, applied to `balance` once every
   * in-flight drop has landed. `null` when nothing is pending.
   */
  settledBalance: bigint | null;
  bet: bigint;
  /** Largest bet the house bankroll can cover for the current table. */
  maxBet: bigint;
  risk: Risk;
  rows: Rows;
  /** Balls per drop, 1..MAX_BALLS_PER_DROP. `bet` is per ball. */
  ballCount: number;
  /** Most recent ball to land. */
  lastWin: { multiplierX100: number; payout: bigint } | null;
  /** Most recent drop whose last ball landed. */
  lastDrop: DropSummary | null;
  /** Drops started whose balls have not all landed yet (or failed). */
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
  | { type: "SET_BALL_COUNT"; payload: number }
  | { type: "SET_LAST_WIN"; payload: GameState["lastWin"] }
  /** Every ball of a drop landed; reveals its payout in the balance. */
  | { type: "SET_LAST_DROP"; payload: DropSummary }
  /** `payload` is the whole stake of the drop (bet × ballCount). */
  | { type: "BET_STARTED"; payload: bigint }
  /** The canister answered; `payload` is its balance, shown once the drop lands. */
  | { type: "BET_SETTLED"; payload: bigint }
  | { type: "BET_FAILED"; payload: { bet: bigint; error: string } }
  | { type: "CLEAR_PLAY_ERROR" };

const GameStateContext = createContext<GameState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

const initialState: GameState = {
  token: null,
  balance: 0n,
  settledBalance: null,
  bet: 0n,
  maxBet: 0n,
  risk: "low",
  rows: 14,
  ballCount: 1,
  lastWin: null,
  lastDrop: null,
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
        settledBalance: null,
        bet: 0n,
        maxBet: 0n,
        lastWin: null,
        lastDrop: null,
        inFlight: 0,
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
    case "SET_BALL_COUNT": {
      if (!Number.isFinite(action.payload)) return state;
      const ballCount = clampBallCount(action.payload);
      // More balls shrink the per-ball cap (balance and house limit are
      // shared by the whole drop); pull the bet down so Drop stays enabled.
      // A zero cap means the balance or house limit is not known yet (or
      // nothing is affordable): leave the bet alone rather than zero it, as
      // nothing would put it back once the real limit arrives.
      const cap = perBallCap(state.balance, state.maxBet, ballCount);
      return {
        ...state,
        ballCount,
        bet: cap > 0n && state.bet > cap ? cap : state.bet,
      };
    }
    case "SET_LAST_WIN":
      return { ...state, lastWin: action.payload };
    case "SET_LAST_DROP": {
      // A report for a drop that was reset away (token change) must not
      // touch the balance.
      if (state.inFlight === 0) {
        return { ...state, lastDrop: action.payload, settledBalance: null };
      }
      const inFlight = state.inFlight - 1;
      // Reveal this drop's payout now that its balls have landed. Once no
      // drop is pending, the canister's answer replaces the local arithmetic.
      const revealed = state.balance + action.payload.totalPayout;
      const balance =
        inFlight === 0 && state.settledBalance !== null
          ? state.settledBalance
          : revealed;
      return {
        ...state,
        lastDrop: action.payload,
        balance,
        settledBalance: inFlight === 0 ? null : state.settledBalance,
        inFlight,
      };
    }
    case "BET_STARTED":
      // A new drop is on its way: clear the previous result so it is not
      // read as belonging to the balls about to land.
      return {
        ...state,
        balance: state.balance - action.payload,
        inFlight: state.inFlight + 1,
        lastWin: null,
        lastDrop: null,
        playError: null,
      };
    case "BET_SETTLED":
      // Hold the canister's balance: showing it now would give away the
      // outcome before the balls have landed (SET_LAST_DROP reveals it).
      // A settle for a drop that was reset away (token change) is dropped.
      if (state.inFlight === 0) return state;
      return { ...state, settledBalance: action.payload };
    case "BET_FAILED": {
      const inFlight = Math.max(0, state.inFlight - 1);
      const refunded = state.balance + action.payload.bet;
      return {
        ...state,
        balance:
          inFlight === 0 && state.settledBalance !== null
            ? state.settledBalance
            : refunded,
        settledBalance: inFlight === 0 ? null : state.settledBalance,
        inFlight,
        playError: action.payload.error,
      };
    }
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
