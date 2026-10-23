import { useEffect, useState } from "react";
import { MAX_BALLS_PER_DROP } from "@plinko/shared";
import { useGameState, useGameDispatch } from "../contexts/GameContext.tsx";

/** Quick picks; anything up to MAX_BALLS_PER_DROP can be typed in the field. */
const PRESETS = [1, 10, 50, 100].filter((n) => n <= MAX_BALLS_PER_DROP);

export default function BallCountSelector() {
  const { ballCount } = useGameState();
  const dispatch = useGameDispatch();

  // Local text so the user can clear and retype; committed on blur / Enter.
  const [text, setText] = useState(String(ballCount));
  useEffect(() => {
    setText(String(ballCount));
  }, [ballCount]);

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? parsed : ballCount;
    // The reducer clamps to 1..MAX_BALLS_PER_DROP; resync the field so an
    // out-of-range value never lingers on screen.
    dispatch({ type: "SET_BALL_COUNT", payload: next });
    setText(String(Math.min(MAX_BALLS_PER_DROP, Math.max(1, next))));
  };

  return (
    <div className="control-group">
      <label>Balls per drop (max {MAX_BALLS_PER_DROP})</label>
      <div className="rows-selector">
        {PRESETS.map((n) => (
          <button
            key={n}
            className={`btn rows-btn${ballCount === n ? " active" : ""}`}
            onClick={() => dispatch({ type: "SET_BALL_COUNT", payload: n })}
          >
            {n}
          </button>
        ))}
        <input
          className="ball-count-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_BALLS_PER_DROP}
          step={1}
          value={text}
          aria-label="Balls per drop"
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commit(text)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(text);
          }}
        />
      </div>
    </div>
  );
}
