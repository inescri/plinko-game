import { useGameState, useGameDispatch } from '../contexts/GameContext.tsx';
import type { Risk } from '../contexts/GameContext.tsx';

const RISKS: Risk[] = ['low', 'medium', 'high'];

export default function RiskSelector() {
  const { risk } = useGameState();
  const dispatch = useGameDispatch();

  return (
    <div className="control-group">
      <label>Risk</label>
      <div className="risk-selector">
        {RISKS.map((r) => (
          <button
            key={r}
            className={`btn risk-btn risk-${r}${risk === r ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_RISK', payload: r })}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
