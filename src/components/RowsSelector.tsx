import { useGameState, useGameDispatch } from "../contexts/GameContext.tsx";

const ROW_OPTIONS = [8, 10, 12, 14, 16] as const;

export default function RowsSelector() {
  const { rows } = useGameState();
  const dispatch = useGameDispatch();

  return (
    <div className="control-group">
      <label>Rows</label>
      <div className="rows-selector">
        {ROW_OPTIONS.map((r) => (
          <button
            key={r}
            className={`btn rows-btn${rows === r ? " active" : ""}`}
            onClick={() => dispatch({ type: "SET_ROWS", payload: r })}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
