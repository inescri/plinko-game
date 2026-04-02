import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameProvider } from "./contexts/GameContext.tsx";
import { WalletProvider } from "./contexts/WalletContext.tsx";
import App from "./App.tsx";
import "../style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </GameProvider>
  </StrictMode>,
);
