import { useCallback, useEffect, useRef, useState } from "react";
import PlinkoCanvas, {
  type PlinkoCanvasRef,
} from "./components/PlinkoCanvas.tsx";
import WalletSection from "./components/WalletSection.tsx";
import BalanceDisplay from "./components/BalanceDisplay.tsx";
import BetControls from "./components/BetControls.tsx";
import RowsSelector from "./components/RowsSelector.tsx";
import RiskSelector from "./components/RiskSelector.tsx";
import DropButton from "./components/DropButton.tsx";
import LastWin from "./components/LastWin.tsx";
import DepositModal from "./components/DepositModal.tsx";
import { useWallet } from "./contexts/WalletContext.tsx";
import { useGameDispatch } from "./contexts/GameContext.tsx";

export default function App() {
  const canvasRef = useRef<PlinkoCanvasRef>(null);
  const { connectedUser } = useWallet();
  const dispatch = useGameDispatch();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const prevConnected = useRef(false);

  const handleDrop = useCallback(() => {
    canvasRef.current?.spawnBall();
  }, []);

  const handleDropStateChange = useCallback((dropping: boolean) => {
    setIsDropping(dropping);
  }, []);

  const handleDropError = useCallback(
    (error: string) => {
      dispatch({ type: "SET_ERROR", payload: error });
      // Auto-clear error after 4 seconds
      setTimeout(() => dispatch({ type: "SET_ERROR", payload: null }), 4000);
    },
    [dispatch],
  );

  // Auto-open deposit modal when wallet connects, close on disconnect
  useEffect(() => {
    if (connectedUser && !prevConnected.current) {
      setShowDepositModal(true);
    } else if (!connectedUser) {
      setShowDepositModal(false);
    }
    prevConnected.current = !!connectedUser;
  }, [connectedUser]);

  // Keyboard shortcut: Space to drop ball (disabled while a drop is in flight)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        (e.target as HTMLElement).tagName !== "INPUT" &&
        !canvasRef.current?.isDropping()
      ) {
        e.preventDefault();
        canvasRef.current?.spawnBall();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
        <PlinkoCanvas
          ref={canvasRef}
          onDropStateChange={handleDropStateChange}
          onError={handleDropError}
        />
      </div>
      <div className="bottom-bar">
        <BetControls />
        <RowsSelector />
        <RiskSelector />
        <DropButton onDrop={handleDrop} isLoading={isDropping} />
      </div>
      {showDepositModal && (
        <DepositModal onClose={() => setShowDepositModal(false)} />
      )}
    </div>
  );
}
