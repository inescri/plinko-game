import { useGameState, useGameDispatch } from "../contexts/GameContext.tsx";

export default function BetControls() {
  const { bet, balance } = useGameState();
  const dispatch = useGameDispatch();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1;
    dispatch({ type: "SET_BET", payload: Math.max(1, Math.min(balance, val)) });
  };

  return (
    <div className="control-group">
      <label>Bet Amount</label>
      <div className="bet-controls">
        <input
          type="number"
          value={bet}
          min="1"
          step="1"
          onChange={handleChange}
        />
      </div>
      <div className="bet-percent-buttons">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            className="btn btn-sm"
            onClick={() =>
              dispatch({
                type: "SET_BET",
                payload: Math.max(1, Math.floor((balance * pct) / 100)),
              })
            }
          >
            {pct}%
          </button>
        ))}
      </div>
    </div>
  );
}
