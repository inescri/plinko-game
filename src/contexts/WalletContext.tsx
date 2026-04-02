import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  OdinConnect,
  type OdinConnectedUser,
  type OdinBalance,
} from "odin-connect";
import { useGameDispatch } from "./GameContext.tsx";

interface WalletContextValue {
  connectedUser: OdinConnectedUser | null;
  principal: string;
  tokenBalances: readonly OdinBalance[];
  isConnecting: boolean;
  connectionError: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getTokenBalance: {
    (tokenId: string | number, mode: "full"): bigint;
    (tokenId: string | number, mode?: "display"): number;
  };
}

const WalletContext = createContext<WalletContextValue | null>(null);

const odinConnect = new OdinConnect({ name: "Plinko", env: "local" });

function truncatePrincipal(principal: string): string {
  if (!principal || principal.length <= 12) return principal;
  return principal.slice(0, 5) + "..." + principal.slice(-3);
}

function computeTokenBalance(token: OdinBalance): number {
  if (!token) return 0;
  const decimals = token.decimals ?? 0;
  const divisibility = token.divisibility ?? 8;
  const divisor = Math.pow(10, divisibility + decimals);
  return Number(token.balance) / divisor;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedUser, setConnectedUser] = useState<OdinConnectedUser | null>(
    null,
  );
  const [tokenBalances, setTokenBalances] = useState<readonly OdinBalance[]>(
    [],
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const dispatch = useGameDispatch();

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const user = await odinConnect.connect({
        requires_api: false,
        requires_delegation: false,
      });
      setConnectedUser(user);

      try {
        const balances = await user.getBalances({ page: 1, limit: 20 });
        setTokenBalances(Array.isArray(balances) ? balances : []);
      } catch (err) {
        console.error("Failed to fetch token balances:", err);
        setTokenBalances([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet connection failed";
      console.error("Wallet connection failed:", err);
      setConnectionError(message);
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
    ((tokenId: string | number, mode: "display" | "full" = "display") => {
      const token = tokenBalances.find((b) => String(b.id) === String(tokenId));
      if (!token) return mode === "full" ? BigInt(0) : 0;
      return mode === "full" ? token.balance : computeTokenBalance(token);
    }) as WalletContextValue["getTokenBalance"],
    [tokenBalances],
  );

  const value: WalletContextValue = {
    connectedUser,
    principal: connectedUser
      ? truncatePrincipal(connectedUser.principal || "Unknown")
      : "",
    tokenBalances,
    isConnecting,
    connectionError,
    connectWallet,
    disconnectWallet,
    getTokenBalance,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (ctx === null)
    throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
