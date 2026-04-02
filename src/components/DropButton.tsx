import { useGameState } from '../contexts/GameContext.tsx';

interface DropButtonProps {
  onDrop: () => void;
}

export default function DropButton({ onDrop }: DropButtonProps) {
  const { risk } = useGameState();

  return (
    <button className={`btn btn-drop drop-${risk}`} onClick={onDrop}>
      Drop Ball
    </button>
  );
}
