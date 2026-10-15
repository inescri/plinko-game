import { useEffect, useRef, useState } from "react";
import { useWallet } from "../contexts/WalletContext.tsx";
import { OdinUtils } from "odin-connect";
import { APP_CANISTER_ID } from "../canister/config.ts";

interface DepositModalProps {
  onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
  const { tokenBalances, getTokenBalance, connectedUser, request } =
    useWallet();

  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  // Approve requests already settled when this modal opened must not close
  // it or show as errors; only requests started from here count.
  const startedRequestIds = useRef(new Set<string>());
  const openedWithRequestId = useRef(request?.id ?? null);

  const approveRequest =
    request?.action === "icrc_approve" &&
    request.id !== openedWithRequestId.current
      ? request
      : null;
  const isDepositing = approveRequest?.status === "pending";

  let error = localError;
  if (approveRequest?.status === "rejected") {
    error =
      approveRequest.error === "popup_closed"
        ? "Approval window was closed"
        : "Approval was rejected";
  } else if (approveRequest?.status === "failed") {
    error = approveRequest.error ?? "Deposit failed";
  }

  // Balance was credited in WalletContext; just close once per success.
  useEffect(() => {
    if (approveRequest?.status !== "success") return;
    if (startedRequestIds.current.has(approveRequest.id)) return;
    startedRequestIds.current.add(approveRequest.id);
    onClose();
  }, [approveRequest, onClose]);

  const walletBalance = selectedTokenId ? getTokenBalance(selectedTokenId) : 0;

  function handleDeposit() {
    const numAmount = Number(amount);
    if (
      !selectedTokenId ||
      numAmount <= 0 ||
      numAmount > walletBalance ||
      isDepositing
    )
      return;

    setLocalError(null);

    if (!connectedUser) {
      setLocalError("Wallet not connected");
      return;
    }
    if (!APP_CANISTER_ID) {
      setLocalError("App canister id not configured");
      return;
    }
    const token = tokenBalances.find((t) => t.id === selectedTokenId);
    if (!token) {
      setLocalError(`Token "${selectedTokenId}" not found`);
      return;
    }

    const odinAmount = OdinUtils.convertToOdinAmount(amount, token);
    console.log(
      `Depositing ${numAmount} ${token.ticker} (Odin amount: ${odinAmount}) for user ${connectedUser.principal}`,
    );

    // Not awaited: in redirect mode the page reloads and the result arrives
    // through wallet state. The display amount travels in returnState.
    void connectedUser.icrcApprove({
      token: selectedTokenId,
      amount: odinAmount,
      spender: APP_CANISTER_ID,
      returnState: { flow: "deposit", displayAmount: numAmount },
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Deposit</h2>

        <div className="control-group">
          <label>Token</label>
          <select
            id="token-select"
            value={selectedTokenId}
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
                {token.id} {token.ticker}
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
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="bet-percent-buttons">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              className="btn"
              disabled={!selectedTokenId}
              onClick={() => setAmount(String((walletBalance * pct) / 100))}
            >
              {pct}%
            </button>
          ))}
        </div>

        {error && <div className="deposit-error">{error}</div>}

        <button
          className="btn btn-deposit"
          disabled={
            !selectedTokenId ||
            Number(amount) <= 0 ||
            Number(amount) > walletBalance ||
            isDepositing
          }
          onClick={handleDeposit}
        >
          {isDepositing ? "Depositing..." : "Deposit"}
        </button>
      </div>
    </div>
  );
}
