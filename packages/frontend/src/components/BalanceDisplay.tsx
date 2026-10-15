import { useGameState } from "../contexts/GameContext.tsx";
import { useWallet } from "../contexts/WalletContext.tsx";
import { formatFixed, placesOf } from "../lib/amounts.ts";

export default function BalanceDisplay() {
  const { balance, token } = useGameState();
  const { internalBalances, getTokenInfo, selectGameToken } = useWallet();

  const formatted = token ? formatFixed(balance, placesOf(token)) : "0.00";

  return (
    <div className="balance-display">
      <span className="balance-label">Game Balance</span>
      <span className="balance-value">
        {formatted}
        {token ? ` ${token.ticker}` : ""}
      </span>
      {internalBalances.length > 1 && (
        <select
          value={token?.id ?? ""}
          onChange={(e) => selectGameToken(e.target.value)}
        >
          {internalBalances.map((b) => {
            const info = getTokenInfo(b.token);
            return (
              <option key={b.token} value={b.token}>
                {info ? info.ticker : b.token}
                {info ? ` · ${formatFixed(b.amount, placesOf(info))}` : ""}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
}
