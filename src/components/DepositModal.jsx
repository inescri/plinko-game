import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext.jsx';
import { useGameDispatch } from '../contexts/GameContext.jsx';

export default function DepositModal({ onClose }) {
  const { tokenBalances, getTokenBalance } = useWallet();
  const dispatch = useGameDispatch();

  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [amount, setAmount] = useState('');

  const walletBalance = selectedTokenId ? getTokenBalance(selectedTokenId) : 0;

  function handleDeposit() {
    const numAmount = Number(amount);
    if (!selectedTokenId || numAmount <= 0 || numAmount > walletBalance) return;
    dispatch({ type: 'SET_BALANCE', payload: numAmount });
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
          disabled={!selectedTokenId || Number(amount) <= 0 || Number(amount) > walletBalance}
          onClick={handleDeposit}
        >
          Deposit
        </button>
      </div>
    </div>
  );
}
