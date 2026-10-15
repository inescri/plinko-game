import { useEffect, useRef, useState } from "react";
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
import WithdrawModal from "./components/WithdrawModal.tsx";
import FundHouseModal from "./components/FundHouseModal.tsx";
import { useWallet } from "./contexts/WalletContext.tsx";
import { usePlay } from "./hooks/usePlay.ts";
import { GAME_TOKEN_ID } from "./canister/config.ts";

export default function App() {
  const canvasRef = useRef<PlinkoCanvasRef>(null);
  const { connectedUser, request, internalBalances, internalLoaded } =
    useWallet();
  const { play, canPlay } = usePlay(canvasRef);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showFundHouseModal, setShowFundHouseModal] = useState(false);
  const promptedRef = useRef(false);

  // Offer a deposit once per session when the player holds none of the game
  // token. Not after a redirect-return from an approval: that flow is already
  // crediting.
  useEffect(() => {
    if (!connectedUser) {
      promptedRef.current = false;
      setShowDepositModal(false);
      setShowWithdrawModal(false);
      setShowFundHouseModal(false);
      return;
    }
    if (promptedRef.current || !internalLoaded) return;
    if (request?.action === "icrc_approve") return;
    promptedRef.current = true;
    const held = internalBalances.find((b) => b.token === GAME_TOKEN_ID);
    if (!held || held.amount === 0n) {
      setShowDepositModal(true);
    }
  }, [connectedUser, internalLoaded, internalBalances, request]);

  // Keyboard shortcut: Space to drop ball
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "SELECT") {
        e.preventDefault();
        play();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [play]);

  return (
    <div className="container">
      <h1 className="title">PLINKODIN</h1>
      <div className="top-bar">
        <WalletSection
          onDeposit={() => setShowDepositModal(true)}
          onWithdraw={() => setShowWithdrawModal(true)}
          onFundHouse={() => setShowFundHouseModal(true)}
        />
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
        <DropButton onDrop={play} disabled={!canPlay} />
      </div>
      {showDepositModal && (
        <DepositModal onClose={() => setShowDepositModal(false)} />
      )}
      {showWithdrawModal && (
        <WithdrawModal onClose={() => setShowWithdrawModal(false)} />
      )}
      {showFundHouseModal && (
        <FundHouseModal onClose={() => setShowFundHouseModal(false)} />
      )}
    </div>
  );
}
