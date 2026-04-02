import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

export type Risk = "low" | "medium" | "high";

export interface GameState {
  balance: number;
  bet: number;
  risk: Risk;
  rows: number;
  lastWin: { mult: number; amount: number } | null;
}

export type GameAction =
  | { type: "SET_BALANCE"; payload: number }
  | { type: "DEDUCT_BET"; payload: number }
  | { type: "ADD_WINNINGS"; payload: number }
  | { type: "SET_BET"; payload: number }
  | { type: "SET_RISK"; payload: Risk }
  | { type: "SET_ROWS"; payload: number }
  | { type: "SET_LAST_WIN"; payload: { mult: number; amount: number } | null };

const GameStateContext = createContext<GameState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

const initialState: GameState = {
  balance: 0,
  bet: 10,
  risk: "low",
  rows: 14,
  lastWin: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_BALANCE":
      return { ...state, balance: action.payload };
    case "DEDUCT_BET":
      return { ...state, balance: state.balance - action.payload };
    case "ADD_WINNINGS":
      return { ...state, balance: state.balance + action.payload };
    case "SET_BET":
      return { ...state, bet: action.payload };
    case "SET_RISK":
      return { ...state, risk: action.payload };
    case "SET_ROWS":
      return { ...state, rows: action.payload };
    case "SET_LAST_WIN":
      return { ...state, lastWin: action.payload };
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
