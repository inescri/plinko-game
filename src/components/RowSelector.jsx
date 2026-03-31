import { useGameState, useGameDispatch } from '../contexts/GameContext.jsx';

const ROW_OPTIONS = [8, 10, 12, 14, 16];

export default function RowSelector() {
  const { rows } = useGameState();
  const dispatch = useGameDispatch();

  return (
    <div className="control-group">
      <label>Rows</label>
      <div className="row-selector">
        {ROW_OPTIONS.map((r) => (
          <button
            key={r}
            className={`btn row-btn${rows === r ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ROWS', payload: r })}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
