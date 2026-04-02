import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext.tsx';
import { useGameDispatch } from '../contexts/GameContext.tsx';
import { convertToOdinAmount } from 'odin-connect/dist/utils/index';

interface DepositModalProps {
  onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
  const { tokenBalances, getTokenBalance, connectedUser } = useWallet();
  const dispatch = useGameDispatch();

  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const walletBalance = selectedTokenId ? getTokenBalance(selectedTokenId) : 0;

  async function handleDeposit() {
    const numAmount = Number(amount);
    if (!selectedTokenId || numAmount <= 0 || numAmount > walletBalance || isDepositing) return;
    setIsDepositing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const token = tokenBalances.find((t) => t.id === selectedTokenId);
    if (!token) {
      setIsDepositing(false);
      return;
    }
    const odinAmount = convertToOdinAmount(amount, token);
    console.log(`Depositing ${numAmount} ${token.ticker} (Odin amount: ${odinAmount}) for user ${connectedUser?.principal}`);
    connectedUser?.icrcApprove({
      token: selectedTokenId,
      amount: odinAmount,
      spender: 'sfgyi-iyaaa-aaaam-qepyq-cai', // Replace with actual canister ID
    });
    dispatch({ type: 'SET_BALANCE', payload: numAmount });
    dispatch({ type: 'SET_BET', payload: Math.floor(numAmount * 0.05) || 1 });
    onClose();
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
              setAmount('');
            }}
          >
            <option value="" disabled>Select a token</option>
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
              onClick={() => setAmount(String(walletBalance * pct / 100))}
            >
              {pct}%
            </button>
          ))}
        </div>

        <button
          className="btn btn-deposit"
          disabled={!selectedTokenId || Number(amount) <= 0 || Number(amount) > walletBalance || isDepositing}
          onClick={handleDeposit}
        >
          {isDepositing ? 'Depositing...' : 'Deposit'}
        </button>
      </div>
    </div>
  );
}
