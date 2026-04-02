import { createContext, useCallback, useContext, useState } from "react";
import { OdinConnect } from "odin-connect";
import { useGameDispatch } from "./GameContext.jsx";

const WalletContext = createContext(null);

const odinConnect = new OdinConnect({ name: "Plinko", env: "dev" });

function truncatePrincipal(principal) {
  if (!principal || principal.length <= 12) return principal;
  return principal.slice(0, 5) + "..." + principal.slice(-3);
}

function computeTokenBalance(token) {
  if (!token) return 0;
  const decimals = token.decimals ?? 0;
  const divisibility = token.divisibility ?? 8;
  const divisor = Math.pow(10, divisibility + decimals);
  return Number(token.balance) / divisor;
}

export function WalletProvider({ children }) {
  const [connectedUser, setConnectedUser] = useState(null);
  const [tokenBalances, setTokenBalances] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const dispatch = useGameDispatch();

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      const user = await odinConnect.connect({
        requires_api: false,
        requires_delegation: false,
      });
      setConnectedUser(user);

      // Fetch token balances
      try {
        const balances = await user.getBalances({ page: 1, limit: 20 });
        setTokenBalances(Array.isArray(balances) ? balances : []);
      } catch (err) {
        console.error("Failed to fetch token balances:", err);
        setTokenBalances([]);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setConnectedUser(null);
    setTokenBalances([]);
    dispatch({ type: "SET_BALANCE", payload: 0 });
  }, [dispatch]);

  const getTokenBalance = useCallback(
    (tokenId) => {
      const token = tokenBalances.find((b) => String(b.id) === String(tokenId));
      return computeTokenBalance(token || null);
    },
    [tokenBalances],
  );

  const value = {
    connectedUser,
    principal: connectedUser
      ? truncatePrincipal(connectedUser.principal || "Unknown")
      : "",
    tokenBalances,
    isConnecting,
    connectWallet,
    disconnectWallet,
    getTokenBalance,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (ctx === null)
    throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
