import { useEffect, useRef, useState } from "react";
import { useWallet } from "../contexts/WalletContext.tsx";
import { OdinUtils } from "odin-connect";
import { APP_CANISTER_ID } from "../canister/config.ts";
import type { ApprovalReturnState } from "../odin/approvalFlow.ts";

interface DepositModalProps {
  onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
  const {
    tokenBalances,
    getWalletBalance,
    connectedUser,
    actor,
    flowStage,
    flowError,
    depositsCompleted,
  } = useWallet();

  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const openedWith = useRef(depositsCompleted);

  // Close once the canister has credited a deposit started from here.
  useEffect(() => {
    if (depositsCompleted > openedWith.current) onClose();
  }, [depositsCompleted, onClose]);

  const busy = flowStage !== "idle";
  const error = localError ?? flowError;
  const walletBalance = selectedTokenId ? getWalletBalance(selectedTokenId) : 0;
  const numAmount = Number(amount);
  const invalid =
    !selectedTokenId || numAmount <= 0 || numAmount > walletBalance;

  function handleDeposit() {
    if (invalid || busy) return;
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
    const token = tokenBalances.find((t) => t.id === selectedTokenId);
    if (!token) {
      setLocalError(`Token "${selectedTokenId}" not found`);
      return;
    }

    const odinAmount = OdinUtils.convertToOdinAmount(amount, token);
    if (odinAmount <= 0n) {
      setLocalError("Amount too small");
      return;
    }

    // Step 1: ICRC-2 approval through Odin. Not awaited — the result arrives
    // through wallet state (popup or redirect) and WalletContext then calls
    // the canister's `deposit`, which pulls the approved funds.
    const returnState: ApprovalReturnState = { flow: "deposit" };
    void connectedUser.icrcApprove({
      token: selectedTokenId,
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
        : "Deposit";

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Deposit</h2>

        <div className="control-group">
          <label>Token</label>
          <select
            id="token-select"
            value={selectedTokenId}
            disabled={busy}
            onChange={(e) => {
              setSelectedTokenId(e.target.value);
              setAmount("");
            }}
          >
            <option value="" disabled>
              Select a token
            </option>
            {tokenBalances.map((token) => (
              <option key={token.id} value={token.id}>
                {token.ticker} ({token.id})
              </option>
            ))}
          </select>
        </div>

        {selectedTokenId && (
          <div className="modal-balance-info">
            Wallet Balance: {walletBalance.toFixed(2)}
          </div>
        )}

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
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="bet-percent-buttons">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              className="btn"
              disabled={!selectedTokenId || busy}
              onClick={() => setAmount(String((walletBalance * pct) / 100))}
            >
              {pct}%
            </button>
          ))}
        </div>

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
