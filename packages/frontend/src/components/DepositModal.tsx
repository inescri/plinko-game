import { useEffect, useRef, useState } from "react";
import { useWallet } from "../contexts/WalletContext.tsx";
import { APP_CANISTER_ID, GAME_TOKEN_ID } from "../canister/config.ts";
import type { ApprovalReturnState } from "../odin/approvalFlow.ts";
import { odinTokenUrl } from "../odin/client.ts";
import { parseTokenAmount, placesOf, toPlainDecimal } from "../lib/amounts.ts";
import RefreshBalanceButton from "./RefreshBalanceButton.tsx";

interface DepositModalProps {
  onClose: () => void;
}

/**
 * Deposit the game token (`GAME_TOKEN_ID`) into the app canister. Only that
 * one token is offered: the house is funded in it and the game plays in it.
 */
export default function DepositModal({ onClose }: DepositModalProps) {
  const {
    getTokenInfo,
    getWalletBalance,
    connectedUser,
    actor,
    flowStage,
    flowError,
    depositsCompleted,
    refreshError,
  } = useWallet();

  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const openedWith = useRef(depositsCompleted);

  // Close once the canister has credited a deposit started from here.
  useEffect(() => {
    if (depositsCompleted > openedWith.current) onClose();
  }, [depositsCompleted, onClose]);

  const token = getTokenInfo(GAME_TOKEN_ID);
  const ticker = token?.ticker ?? GAME_TOKEN_ID.toUpperCase();
  const busy = flowStage !== "idle";
  const error = localError ?? flowError ?? refreshError;
  const walletBalance = getWalletBalance();
  const numAmount = Number(amount);
  const invalid = !token || numAmount <= 0 || numAmount > walletBalance;
  const places = token ? placesOf(token) : 0;
  const buyUrl = odinTokenUrl(GAME_TOKEN_ID);

  function handleDeposit() {
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

    const odinAmount = parseTokenAmount(amount, token);
    if (odinAmount <= 0n) {
      setLocalError("Amount too small");
      return;
    }

    // Step 1: ICRC-2 approval through Odin. Not awaited — the result arrives
    // through wallet state (popup or redirect) and WalletContext then calls
    // the canister's `deposit`, which pulls the approved funds.
    const returnState: ApprovalReturnState = { flow: "deposit" };
    void connectedUser.icrcApprove({
      token: GAME_TOKEN_ID,
      amount: odinAmount,
      spender: APP_CANISTER_ID,
      returnState,
    });
  }

  const label =
    flowStage === "approving"
      ? "Approving…"
      : flowStage === "crediting"
        ? "Crediting…"
        : `Deposit ${ticker}`;

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Deposit {ticker}</h2>

        <div className="modal-balance-info with-refresh">
          {token
            ? `Wallet Balance: ${walletBalance.toFixed(2)} ${ticker}`
            : `Loading ${ticker}…`}
          <RefreshBalanceButton disabled={busy} />
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

        {token && walletBalance === 0 && (
          <div className="deposit-error">
            No {ticker} in your Odin wallet to deposit.
          </div>
        )}
        <a
          className="modal-link"
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy {ticker} on Odin ↗
        </a>
        {error && <div className="deposit-error">{error}</div>}

        <button
          className="btn btn-deposit"
          disabled={invalid || busy}
          onClick={handleDeposit}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
