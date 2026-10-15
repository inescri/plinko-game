import { useGameState } from "../contexts/GameContext.tsx";

interface DropButtonProps {
  onDrop: () => void;
  disabled: boolean;
}

export default function DropButton({ onDrop, disabled }: DropButtonProps) {
  const { risk, inFlight, playError } = useGameState();

  return (
    <div className="control-group">
      <button
        className={`btn btn-drop drop-${risk}`}
        onClick={onDrop}
        disabled={disabled}
      >
        {inFlight > 0 ? `Dropping… (${inFlight})` : "Drop Ball"}
      </button>
      {playError && <div className="deposit-error">{playError}</div>}
    </div>
  );
}
