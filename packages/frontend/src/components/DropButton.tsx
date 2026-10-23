import { useGameState } from "../contexts/GameContext.tsx";

interface DropButtonProps {
  onDrop: () => void;
  disabled: boolean;
}

export default function DropButton({ onDrop, disabled }: DropButtonProps) {
  const { risk, inFlight, playError, ballCount } = useGameState();
  const idle = ballCount > 1 ? `Drop ${ballCount} Balls` : "Drop Ball";

  return (
    <div className="control-group">
      <button
        className={`btn btn-drop drop-${risk}`}
        onClick={onDrop}
        disabled={disabled}
      >
        {inFlight > 0 ? `Dropping… (${inFlight})` : idle}
      </button>
      {playError && <div className="deposit-error">{playError}</div>}
    </div>
  );
}
