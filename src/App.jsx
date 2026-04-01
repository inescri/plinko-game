import { useCallback, useEffect, useRef, useState } from 'react';
import PlinkoCanvas from './components/PlinkoCanvas.jsx';
import WalletSection from './components/WalletSection.jsx';
import BalanceDisplay from './components/BalanceDisplay.jsx';
import BetControls from './components/BetControls.jsx';
import RowsSelector from './components/RowsSelector.jsx';
import RiskSelector from './components/RiskSelector.jsx';
import DropButton from './components/DropButton.jsx';
import LastWin from './components/LastWin.jsx';
import DepositModal from './components/DepositModal.jsx';
import { useWallet } from './contexts/WalletContext.jsx';

export default function App() {
  const canvasRef = useRef(null);
  const { connectedUser } = useWallet();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const prevConnected = useRef(false);

  const handleDrop = useCallback(() => {
    canvasRef.current?.spawnBall();
  }, []);

  // Auto-open deposit modal when wallet connects
  useEffect(() => {
    if (connectedUser && !prevConnected.current) {
      setShowDepositModal(true);
    }
    prevConnected.current = !!connectedUser;
  }, [connectedUser]);

  // Close modal if wallet disconnects
  useEffect(() => {
    if (!connectedUser) {
      setShowDepositModal(false);
    }
  }, [connectedUser]);

  // Keyboard shortcut: Space to drop ball
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        canvasRef.current?.spawnBall();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="container">
      <h1 className="title">PLINKODIN</h1>
      <div className="top-bar">
        <WalletSection onDeposit={() => setShowDepositModal(true)} />
        {connectedUser && (
          <div className="balance-row">
            <BalanceDisplay />
            <LastWin />
          </div>
        )}
      </div>
      <div className="game-area">
        <PlinkoCanvas ref={canvasRef} />
      </div>
      <div className="bottom-bar">
        <BetControls />
        <RowsSelector />
        <RiskSelector />
        <DropButton onDrop={handleDrop} />
      </div>
      {showDepositModal && (
        <DepositModal onClose={() => setShowDepositModal(false)} />
      )}
    </div>
  );
}
