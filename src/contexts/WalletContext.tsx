import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  OdinConnect,
  type OdinConnectedUser,
  type OdinBalance,
  type OdinRequestState,
} from "odin-connect";
import { useGameDispatch } from "./GameContext.tsx";

interface WalletContextValue {
  connectedUser: OdinConnectedUser | null;
  principal: string;
  tokenBalances: readonly OdinBalance[];
  isReady: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  request: OdinRequestState | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  getTokenBalance: {
    (tokenId: string | number, mode: "full"): bigint;
    (tokenId: string | number, mode?: "display"): number;
  };
}

/** `returnState` attached to a deposit's `icrcApprove` call. */
export interface DepositReturnState {
  flow: "deposit";
  displayAmount: number;
}

export function isDepositReturnState(
  value: unknown,
): value is DepositReturnState {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as DepositReturnState).flow === "deposit" &&
    typeof (value as DepositReturnState).displayAmount === "number"
  );
}

const WalletContext = createContext<WalletContextValue | null>(null);

// One instance per page load. Results (connect, approve) arrive through its
// state store, which also works after a redirect-mode page reload.
const odinConnect = new OdinConnect({ name: "Plinko", env: "dev" });

// Request ids whose deposit has been credited. Module scope so React
// StrictMode / remounts never credit the same approval twice.
const handledDeposits = new Set<string>();

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

function deriveConnectionError(
  request: OdinRequestState | null,
  connectedUser: OdinConnectedUser | null,
): string | null {
  if (!request || request.action !== "connect" || connectedUser) return null;
  switch (request.status) {
    case "unverified":
      return "Could not verify the sign-in. Please try again.";
    case "rejected":
      return request.error === "untrusted_origin"
        ? "This app's origin is not trusted by the target canisters."
        : "Sign-in was cancelled.";
    case "failed":
      return request.error ?? "Wallet connection failed";
    default:
      return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user: connectedUser, request, status } = useSyncExternalStore(
    odinConnect.subscribe,
    odinConnect.getState,
    odinConnect.getServerState,
  );
  const [tokenBalances, setTokenBalances] = useState<readonly OdinBalance[]>(
    [],
  );
  const dispatch = useGameDispatch();

  // Id of the latest successful approval; a new one triggers a refetch.
  const approveSuccessId =
    request?.action === "icrc_approve" && request.status === "success"
      ? request.id
      : null;

  // Load balances whenever the user changes or an approval lands.
  useEffect(() => {
    if (!connectedUser) {
      setTokenBalances([]);
      return;
    }
    let cancelled = false;
    connectedUser
      .getBalances({ page: 1, limit: 20 })
      .then((balances) => {
        if (!cancelled) setTokenBalances(Array.isArray(balances) ? balances : []);
      })
      .catch((err) => {
        console.error("Failed to fetch token balances:", err);
        if (!cancelled) setTokenBalances([]);
      });
    return () => {
      cancelled = true;
    };
  }, [connectedUser, approveSuccessId]);

  // Credit the game balance once per successful deposit approval. Reads
  // `returnState` because the modal's locals are gone after a redirect.
  useEffect(() => {
    if (!request || request.action !== "icrc_approve") return;
    if (request.status !== "success") return;
    if (!isDepositReturnState(request.returnState)) return;
    if (handledDeposits.has(request.id)) return;
    handledDeposits.add(request.id);
    const amount = request.returnState.displayAmount;
    dispatch({ type: "SET_BALANCE", payload: amount });
    dispatch({ type: "SET_BET", payload: Math.floor(amount * 0.05) || 1 });
  }, [request, dispatch]);

  const connectWallet = useCallback(() => {
    void odinConnect.connect({
      requires_api: false,
      requires_delegation: false,
    });
  }, []);

  const disconnectWallet = useCallback(() => {
    odinConnect.disconnect();
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
    isReady: status === "ready",
    isConnecting:
      request?.action === "connect" && request.status === "pending",
    connectionError: deriveConnectionError(request, connectedUser),
    request,
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
