import { useCallback, useEffect, useRef } from 'react';
import PlinkoCanvas from './components/PlinkoCanvas.jsx';
import ControlsPanel from './components/ControlsPanel.jsx';

export default function App() {
  const canvasRef = useRef(null);

  const handleDrop = useCallback(() => {
    canvasRef.current?.spawnBall();
  }, []);

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
      <div className="game-area">
        <PlinkoCanvas ref={canvasRef} />
      </div>
      <ControlsPanel onDrop={handleDrop} />
    </div>
  );
}
