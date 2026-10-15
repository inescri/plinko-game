import { useEffect, useRef, useState } from "react";
import { useWallet } from "../contexts/WalletContext.tsx";
import { APP_CANISTER_ID } from "../canister/config.ts";
import type { ApprovalReturnState } from "../odin/approvalFlow.ts";
import {
  formatTokenAmount,
  parseTokenAmount,
  percentOf,
  placesOf,
} from "../lib/amounts.ts";
import {
  WITHDRAW_FEE_APPROVAL,
  WITHDRAW_FEE_SATS,
} from "../lib/fees.ts";
import { ODIN_BTC_TOKEN_ID } from "@plinko/shared";

interface WithdrawModalProps {
  onClose: () => void;
}

export default function WithdrawModal({ onClose }: WithdrawModalProps) {
  const {
    internalBalances,
    getTokenInfo,
    connectedUser,
    actor,
    flowStage,
    flowError,
    withdrawalsCompleted,
  } = useWallet();

  const [selectedTokenId, setSelectedTokenId] = useState(
    internalBalances.find((b) => b.amount > 0n)?.token ?? "",
  );
  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const openedWith = useRef(withdrawalsCompleted);

  useEffect(() => {
    if (withdrawalsCompleted > openedWith.current) onClose();
  }, [withdrawalsCompleted, onClose]);

  const busy = flowStage !== "idle";
  const error = localError ?? flowError;
  const selected = internalBalances.find((b) => b.token === selectedTokenId);
  const info = selectedTokenId ? getTokenInfo(selectedTokenId) : null;
  const places = info ? placesOf(info) : 0;
  const available = selected?.amount ?? 0n;
  const raw = info ? parseTokenAmount(amount, info) : 0n;
  const invalid = !selected || !info || raw <= 0n || raw > available;

  function handleWithdraw() {
    if (invalid || busy || !selected || !info) return;
    setLocalError(null);

    if (!connectedUser) {
      setLocalError("Wallet not connected");
      return;
    }
    if (!actor) {
      setLocalError("Canister session not ready — reconnect and try again");
      return;
    }

    // Step 1: approve the BTC ledger fee. The token + amount to withdraw
    // travel in returnState; WalletContext calls `withdraw` on success.
    const returnState: ApprovalReturnState = {
      flow: "withdraw",
      token: selected.token,
      amount: raw,
    };
    void connectedUser.icrcApprove({
      token: ODIN_BTC_TOKEN_ID,
      amount: WITHDRAW_FEE_APPROVAL,
      spender: APP_CANISTER_ID,
      returnState,
    });
  }

  const label =
    flowStage === "approving"
      ? "Approving fee…"
      : flowStage === "withdrawing"
        ? "Withdrawing…"
        : "Withdraw";

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Withdraw</h2>

        <div className="control-group">
          <label>Token</label>
          <select
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
            {internalBalances.map((b) => {
              const i = getTokenInfo(b.token);
              return (
                <option key={b.token} value={b.token}>
                  {i ? i.ticker : b.token}
                </option>
              );
            })}
          </select>
        </div>

        {selected && info && (
          <div className="modal-balance-info">
            Game Balance: {formatTokenAmount(available, places)} {info.ticker}
          </div>
        )}

        <div className="control-group">
          <label>Amount</label>
          <input
            className="modal-input"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            disabled={busy || !info}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="bet-percent-buttons">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              className="btn"
              disabled={!selected || !info || busy}
              onClick={() =>
                setAmount(formatTokenAmount(percentOf(available, pct), places))
              }
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="modal-balance-info">
          Network fee: {WITHDRAW_FEE_SATS} sats (BTC), approved separately.
        </div>

        {error && <div className="deposit-error">{error}</div>}

        <button
          className="btn btn-deposit"
          disabled={invalid || busy}
          onClick={handleWithdraw}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
