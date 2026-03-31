import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './contexts/GameContext.jsx';
import { WalletProvider } from './contexts/WalletContext.jsx';
import App from './App.jsx';
import '../style.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </GameProvider>
  </StrictMode>
);
