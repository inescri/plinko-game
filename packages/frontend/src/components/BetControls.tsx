import { useEffect, useState } from "react";
import { useGameState, useGameDispatch } from "../contexts/GameContext.tsx";
import {
  formatTokenAmount,
  minBigInt,
  parseTokenAmount,
  percentOf,
  placesOf,
} from "../lib/amounts.ts";

export default function BetControls() {
  const { bet, balance, maxBet, token } = useGameState();
  const dispatch = useGameDispatch();
  const places = token ? placesOf(token) : 0;
  const cap = minBigInt(balance, maxBet);

  // Local text so the user can type freely; committed as bigint on change.
  const [text, setText] = useState(() => formatTokenAmount(bet, places));
  useEffect(() => {
    setText(formatTokenAmount(bet, places));
  }, [bet, places]);

  const commit = (raw: bigint) => {
    const clamped = raw < 0n ? 0n : minBigInt(raw, cap);
    dispatch({ type: "SET_BET", payload: clamped });
    // Resync here too: when the clamped value equals the current bet the
    // effect above does not fire, and the field would keep showing the
    // oversized (or unparsable) text the user typed.
    setText(formatTokenAmount(clamped, places));
  };

  return (
    <div className="control-group">
      <label>Bet Amount{token ? ` (${token.ticker})` : ""}</label>
      <div className="bet-controls">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          disabled={!token}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => token && commit(parseTokenAmount(text, token))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && token) commit(parseTokenAmount(text, token));
          }}
        />
      </div>
      <div className="bet-percent-buttons">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            className="btn btn-sm"
            disabled={!token}
            onClick={() => commit(percentOf(cap, pct))}
          >
            {pct}%
          </button>
        ))}
      </div>
      {token && maxBet < balance && (
        <div className="modal-balance-info">
          Max bet (house limit): {formatTokenAmount(maxBet, places)}
        </div>
      )}
    </div>
  );
}
