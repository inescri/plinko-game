import { useGameState } from '../contexts/GameContext.jsx';

export default function DropButton({ onDrop }) {
  const { risk } = useGameState();

  return (
    <button className={`btn btn-drop drop-${risk}`} onClick={onDrop}>
      Drop Ball
    </button>
  );
}
