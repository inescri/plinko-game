import { useEffect, useRef, useState } from "react";
import { maxBetForHouse } from "@plinko/shared";
import { useWallet } from "../contexts/WalletContext.tsx";
import { APP_CANISTER_ID, GAME_TOKEN_ID } from "../canister/config.ts";
import type { ApprovalReturnState } from "../odin/approvalFlow.ts";
import { formatFixed, parseTokenAmount, placesOf, toPlainDecimal } from "../lib/amounts.ts";

interface FundHouseModalProps {
  onClose: () => void;
}

/**
 * Admin: move game-token funds from the connected Odin wallet into the house
 * bankroll. Same two-step flow as a deposit (ICRC-2 approval, then the
 * canister pulls the funds), but credited to the house instead of the
 * caller. Shown to house admins (`VITE_HOUSE_ADMINS` or the canister
 * owner) only; `fundHouse` itself is open.
 */
export default function FundHouseModal({ onClose }: FundHouseModalProps) {
  const {
    getTokenInfo,
    getWalletBalance,
    connectedUser,
    actor,
    flowStage,
    flowError,
    fundingsCompleted,
    houseBalance,
  } = useWallet();

  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const openedWith = useRef(fundingsCompleted);

  // Close once the canister has credited the bankroll.
  useEffect(() => {
    if (fundingsCompleted > openedWith.current) onClose();
  }, [fundingsCompleted, onClose]);

  const token = getTokenInfo(GAME_TOKEN_ID);
  const ticker = token?.ticker ?? GAME_TOKEN_ID.toUpperCase();
  const busy = flowStage !== "idle";
  const error = localError ?? flowError;
  const walletBalance = getWalletBalance(GAME_TOKEN_ID);
  const numAmount = Number(amount);
  const invalid = !token || numAmount <= 0 || numAmount > walletBalance;

  const places = token ? placesOf(token) : 0;
  const raw = token && numAmount > 0 ? parseTokenAmount(amount, token) : 0n;
  const houseAfter = (houseBalance ?? 0n) + raw;
  // The worst case for the bankroll: the 1000x slot on 16 rows / high.
  const maxBetAfter = maxBetForHouse(houseAfter, "high", 16);

  function handleFund() {
    if (invalid || busy || !token) return;
    setLocalError(null);

    if (!connectedUser) {
      setLocalError("Wallet not connected");
      return;
    }
    if (!APP_CANISTER_ID) {
      setLocalError("App canister id not configured");
      return;
    }
    if (!actor) {
      setLocalError("Canister session not ready — reconnect and try again");
      return;
    }
    if (raw <= 0n) {
      setLocalError("Amount too small");
      return;
    }

    // ICRC-2 approval through Odin; WalletContext then calls `fundHouse`.
    const returnState: ApprovalReturnState = { flow: "fundHouse" };
    void connectedUser.icrcApprove({
      token: GAME_TOKEN_ID,
      amount: raw,
      spender: APP_CANISTER_ID,
      returnState,
    });
  }

  const label =
    flowStage === "approving"
      ? "Approving…"
      : flowStage === "funding"
        ? "Funding…"
        : "Fund house";

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Fund house ({ticker})</h2>

        <div className="modal-balance-info">
          {token && houseBalance !== null
            ? `House bankroll: ${formatFixed(houseBalance, places)} ${ticker}`
            : "Loading house bankroll…"}
        </div>
        <div className="modal-balance-info">
          {token
            ? `Wallet Balance: ${walletBalance.toFixed(2)} ${ticker}`
            : `Loading ${ticker}…`}
        </div>

        <div className="control-group">
          <label>Amount</label>
          <input
            className="modal-input"
            type="number"
            min="0"
            max={walletBalance}
            step="any"
            placeholder="0.00"
            value={amount}
            disabled={busy || !token}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="bet-percent-buttons">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              className="btn"
              disabled={!token || busy}
              onClick={() => setAmount(toPlainDecimal((walletBalance * pct) / 100, places))}
            >
              {pct}%
            </button>
          ))}
        </div>

        {token && (
          <div className="modal-balance-info">
            Max bet after funding (16 rows, high):{" "}
            {formatFixed(maxBetAfter, places)} {ticker}
          </div>
        )}

        {token && walletBalance === 0 && (
          <div className="deposit-error">
            No {ticker} in your Odin wallet to fund with.
          </div>
        )}
        {error && <div className="deposit-error">{error}</div>}

        <button
          className="btn btn-deposit"
          disabled={invalid || busy}
          onClick={handleFund}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
