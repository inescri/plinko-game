import { createContext, useContext, useReducer } from 'react';

const GameStateContext = createContext(null);
const GameDispatchContext = createContext(null);

const initialState = {
  balance: 0,
  bet: 10,
  risk: 'low',
  rows: 16,
  lastWin: null, // { mult, amount }
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_BALANCE':
      return { ...state, balance: action.payload };
    case 'DEDUCT_BET':
      return { ...state, balance: state.balance - action.payload };
    case 'ADD_WINNINGS':
      return { ...state, balance: state.balance + action.payload };
    case 'SET_BET':
      return { ...state, bet: action.payload };
    case 'SET_RISK':
      return { ...state, risk: action.payload };
    case 'SET_ROWS':
      return { ...state, rows: action.payload };
    case 'SET_LAST_WIN':
      return { ...state, lastWin: action.payload };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        {children}
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (ctx === null) throw new Error('useGameState must be used within GameProvider');
  return ctx;
}

export function useGameDispatch() {
  const ctx = useContext(GameDispatchContext);
  if (ctx === null) throw new Error('useGameDispatch must be used within GameProvider');
  return ctx;
}
