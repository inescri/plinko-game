import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type {
  OdinConnectedUser,
  OdinBalance,
  OdinRequestState,
} from "odin-connect";
import { odin } from "../odin/client.ts";
import { approvalFor, claimRequest } from "../odin/approvalFlow.ts";
import { APP_CANISTER_ID } from "../canister/config.ts";
import { useCanisterActor } from "../canister/useCanisterActor.ts";
import type { CanisterActor } from "../canister/idl.ts";
import { percentOf, type TokenInfo } from "../lib/amounts.ts";
import { useGameDispatch, useGameState } from "./GameContext.tsx";

export interface InternalBalance {
  token: string;
  amount: bigint;
}

export type FlowStage =
  | "idle"
  | "approving"
  | "crediting"
  | "withdrawing";

interface WalletContextValue {
  connectedUser: OdinConnectedUser | null;
  principal: string;
  /** Wallet holdings on Odin (what can be deposited). */
  tokenBalances: readonly OdinBalance[];
  /** Balances held inside the app canister (what can be played/withdrawn). */
  internalBalances: readonly InternalBalance[];
  internalLoaded: boolean;
  refreshInternal: () => Promise<void>;
  actor: CanisterActor | null;
  isReady: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  request: OdinRequestState | null;
  /** Deposit / withdraw progress, derived from the SDK request + canister call. */
  flowStage: FlowStage;
  flowError: string | null;
  /** Incremented after each canister `deposit` / `withdraw` completes. */
  depositsCompleted: number;
  withdrawalsCompleted: number;
  connectWallet: () => void;
  disconnectWallet: () => void;
  /** Make `tokenId` the token the game plays with. */
  selectGameToken: (tokenId: string) => void;
  getTokenInfo: (tokenId: string) => TokenInfo | null;
  getWalletBalance: (tokenId: string) => number;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function truncatePrincipal(principal: string): string {
  if (!principal || principal.length <= 12) return principal;
  return principal.slice(0, 5) + "..." + principal.slice(-3);
}

function displayBalance(token: OdinBalance): number {
  const divisor = Math.pow(10, (token.divisibility ?? 8) + (token.decimals ?? 0));
  return Number(token.balance) / divisor;
}

function toTokenInfo(b: Pick<OdinBalance, "id" | "ticker" | "decimals" | "divisibility">): TokenInfo {
  return {
    id: b.id,
    ticker: b.ticker,
    decimals: b.decimals ?? 0,
    divisibility: b.divisibility ?? 8,
  };
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
        ? "This app's origin is not trusted by the app canister."
        : "Sign-in was cancelled.";
    case "failed":
      return request.error ?? "Wallet connection failed";
    default:
      return null;
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user: connectedUser, request, status } = useSyncExternalStore(
    odin.subscribe,
    odin.getState,
    odin.getServerState,
  );
  const actor = useCanisterActor(connectedUser);
  const dispatch = useGameDispatch();
  const game = useGameState();

  const [tokenBalances, setTokenBalances] = useState<readonly OdinBalance[]>([]);
  const [internalBalances, setInternalBalances] = useState<readonly InternalBalance[]>([]);
  const [internalLoaded, setInternalLoaded] = useState(false);
  const [tokenInfos, setTokenInfos] = useState<Record<string, TokenInfo>>({});
  const [flowStage, setFlowStage] = useState<FlowStage>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [depositsCompleted, setDepositsCompleted] = useState(0);
  const [withdrawalsCompleted, setWithdrawalsCompleted] = useState(0);
  /** Token to select once its internal balance shows up (after a deposit). */
  const pendingSelect = useRef<string | null>(null);

  // ── Wallet holdings (Odin API) ──────────────────────────────────────────
  useEffect(() => {
    if (!connectedUser) {
      setTokenBalances([]);
      return;
    }
    let cancelled = false;
    connectedUser
      .getBalances({ page: 1, limit: 50 })
      .then((balances) => {
        if (cancelled) return;
        const list = Array.isArray(balances) ? balances : [];
        setTokenBalances(list);
        setTokenInfos((prev) => {
          const next = { ...prev };
          for (const b of list) next[b.id] = toTokenInfo(b);
          return next;
        });
      })
      .catch((err) => {
        console.error("Failed to fetch token balances:", err);
        if (!cancelled) setTokenBalances([]);
      });
    return () => {
      cancelled = true;
    };
  }, [connectedUser, depositsCompleted, withdrawalsCompleted]);

  // ── Internal balances (app canister) ───────────────────────────────────
  const refreshInternal = useCallback(async () => {
    if (!actor) {
      setInternalBalances([]);
      setInternalLoaded(false);
      return;
    }
    try {
      const entries = await actor.getBalances();
      setInternalBalances(entries.map(([token, amount]) => ({ token, amount })));
    } catch (err) {
      console.error("Failed to fetch internal balances:", err);
    } finally {
      setInternalLoaded(true);
    }
  }, [actor]);

  useEffect(() => {
    void refreshInternal();
  }, [refreshInternal]);

  // Resolve metadata for internally held tokens the wallet no longer lists.
  useEffect(() => {
    const missing = internalBalances
      .map((b) => b.token)
      .filter((id) => tokenInfos[id] === undefined);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map((id) =>
        odin.api
          .getToken(id)
          .then((t) => [id, toTokenInfo(t)] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      setTokenInfos((prev) => {
        const next = { ...prev };
        for (const r of results) if (r) next[r[0]] = r[1];
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [internalBalances, tokenInfos]);

  const getTokenInfo = useCallback(
    (tokenId: string): TokenInfo | null => tokenInfos[tokenId] ?? null,
    [tokenInfos],
  );

  // ── Game token sync ────────────────────────────────────────────────────
  const selectGameToken = useCallback(
    (tokenId: string) => {
      const info = tokenInfos[tokenId];
      if (!info) {
        pendingSelect.current = tokenId;
        return;
      }
      dispatch({ type: "SET_TOKEN", payload: info });
    },
    [dispatch, tokenInfos],
  );

  // Pick a game token automatically: a pending deposit's token, else the
  // first internal balance when none is selected yet.
  useEffect(() => {
    const wanted = pendingSelect.current;
    if (wanted && tokenInfos[wanted]) {
      pendingSelect.current = null;
      dispatch({ type: "SET_TOKEN", payload: tokenInfos[wanted] });
      return;
    }
    if (game.token === null && internalBalances.length > 0) {
      const first = internalBalances.find((b) => b.amount > 0n) ?? internalBalances[0];
      const info = tokenInfos[first.token];
      if (info) dispatch({ type: "SET_TOKEN", payload: info });
    }
  }, [internalBalances, tokenInfos, game.token, dispatch]);

  // Mirror the canister balance for the game token while no bet is pending.
  const gameTokenId = game.token?.id ?? null;
  useEffect(() => {
    if (!gameTokenId || game.inFlight > 0) return;
    const entry = internalBalances.find((b) => b.token === gameTokenId);
    const balance = entry?.amount ?? 0n;
    dispatch({ type: "SET_BALANCE", payload: balance });
    if (game.bet === 0n && balance > 0n) {
      const suggested = percentOf(balance, 5);
      dispatch({ type: "SET_BET", payload: suggested > 0n ? suggested : 1n });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalBalances, gameTokenId, dispatch]);

  // Max bet depends on the house bankroll for the token + table.
  useEffect(() => {
    if (!actor || !gameTokenId) return;
    let cancelled = false;
    actor
      .getMaxBet(gameTokenId, game.rows, game.risk)
      .then((max) => {
        if (!cancelled) dispatch({ type: "SET_MAX_BET", payload: max });
      })
      .catch((err) => console.error("Failed to fetch max bet:", err));
    return () => {
      cancelled = true;
    };
  }, [actor, gameTokenId, game.rows, game.risk, game.inFlight, dispatch]);

  // Clear the game when the session ends.
  useEffect(() => {
    if (!connectedUser) {
      dispatch({ type: "SET_TOKEN", payload: null });
      setInternalBalances([]);
      setInternalLoaded(false);
      setFlowStage("idle");
      setFlowError(null);
    }
  }, [connectedUser, dispatch]);

  // ── Deposit follow-up: approval settled → canister.deposit ──────────────
  useEffect(() => {
    const current = approvalFor(request, "deposit");
    if (current === null) return;
    const { id, status, input } = current.request;
    if (status === "pending") {
      setFlowStage("approving");
      return;
    }
    if (status === "rejected") {
      if (claimRequest(id)) {
        setFlowStage("idle");
        setFlowError(
          current.request.error === "popup_closed"
            ? "Approval window was closed"
            : "Approval was rejected",
        );
      }
      return;
    }
    if (status === "failed") {
      if (claimRequest(id)) {
        setFlowStage("idle");
        setFlowError(current.request.error ?? "Approval failed");
      }
      return;
    }
    if (status !== "success") return;
    if (connectedUser !== null && connectedUser.getIdentity() === null) {
      if (claimRequest(id)) {
        setFlowStage("idle");
        setFlowError("Session has no delegation — reconnect and try again");
      }
      return;
    }
    if (actor === null) return; // re-runs once the actor exists (redirect reload)
    if (!claimRequest(id)) return; // claim BEFORE the await
    void (async () => {
      setFlowError(null);
      setFlowStage("crediting");
      try {
        await actor.deposit(input.token, input.amount);
      } catch (err) {
        setFlowStage("idle");
        setFlowError(errorMessage(err, "Deposit failed"));
        return;
      }
      pendingSelect.current = input.token;
      setFlowStage("idle");
      setDepositsCompleted((n) => n + 1);
      await refreshInternal();
    })();
  }, [request, connectedUser, actor, refreshInternal]);

  // ── Withdraw follow-up: fee approval settled → canister.withdraw ────────
  useEffect(() => {
    const current = approvalFor(request, "withdraw");
    if (current === null) return;
    const { id, status } = current.request;
    if (status === "pending") {
      setFlowStage("approving");
      return;
    }
    if (status === "rejected") {
      if (claimRequest(id)) {
        setFlowStage("idle");
        setFlowError("Fee approval was rejected");
      }
      return;
    }
    if (status === "failed") {
      if (claimRequest(id)) {
        setFlowStage("idle");
        setFlowError(current.request.error ?? "Fee approval failed");
      }
      return;
    }
    if (status !== "success") return;
    if (connectedUser !== null && connectedUser.getIdentity() === null) {
      if (claimRequest(id)) {
        setFlowStage("idle");
        setFlowError("Session has no delegation — reconnect and try again");
      }
      return;
    }
    if (actor === null) return;
    if (!claimRequest(id)) return;
    const { token, amount } = current.returnState;
    void (async () => {
      setFlowError(null);
      setFlowStage("withdrawing");
      try {
        await actor.withdraw(token, amount);
      } catch (err) {
        setFlowStage("idle");
        setFlowError(errorMessage(err, "Withdraw failed"));
        return;
      }
      setFlowStage("idle");
      setWithdrawalsCompleted((n) => n + 1);
      await refreshInternal();
    })();
  }, [request, connectedUser, actor, refreshInternal]);

  // ── Session ────────────────────────────────────────────────────────────
  const connectWallet = useCallback(() => {
    // A delegation scoped to the app canister lets the session make
    // authenticated update calls (deposit / withdraw / play). Fire and
    // forget: the outcome lands in state (popup or redirect).
    void odin.connect(
      APP_CANISTER_ID === ""
        ? { requires_api: true }
        : {
            requires_api: true,
            requires_delegation: true,
            targets: [APP_CANISTER_ID],
          },
    );
  }, []);

  const disconnectWallet = useCallback(() => {
    odin.disconnect();
  }, []);

  const getWalletBalance = useCallback(
    (tokenId: string): number => {
      const token = tokenBalances.find((b) => String(b.id) === String(tokenId));
      return token ? displayBalance(token) : 0;
    },
    [tokenBalances],
  );

  const value: WalletContextValue = {
    connectedUser,
    principal: connectedUser
      ? truncatePrincipal(connectedUser.principal || "Unknown")
      : "",
    tokenBalances,
    internalBalances,
    internalLoaded,
    refreshInternal,
    actor,
    isReady: status === "ready",
    isConnecting:
      request?.action === "connect" && request.status === "pending",
    connectionError: deriveConnectionError(request, connectedUser),
    request,
    flowStage,
    flowError,
    depositsCompleted,
    withdrawalsCompleted,
    connectWallet,
    disconnectWallet,
    selectGameToken,
    getTokenInfo,
    getWalletBalance,
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
