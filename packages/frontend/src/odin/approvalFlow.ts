import type { OdinRequestState } from "odin-connect";

/**
 * `returnState` the deposit and withdraw flows attach to their ICRC-2
 * approval. Both start an `icrc_approve` request, so `input` alone cannot
 * tell them apart; `flow` is the discriminator. Withdraw also carries the
 * token + amount to withdraw (its approval is for the BTC fee, so those are
 * not in `request.input`, and in redirect mode the form's state is gone).
 */
export type ApprovalReturnState =
  | { flow: "deposit" }
  | { flow: "withdraw"; token: string; amount: bigint };

export type IcrcApproveRequest = Extract<
  OdinRequestState,
  { action: "icrc_approve" }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseApprovalReturnState(
  value: unknown,
): ApprovalReturnState | null {
  if (!isRecord(value)) return null;
  if (value.flow === "deposit") return { flow: "deposit" };
  if (
    value.flow === "withdraw" &&
    typeof value.token === "string" &&
    typeof value.amount === "bigint"
  ) {
    return { flow: "withdraw", token: value.token, amount: value.amount };
  }
  return null;
}

/** The latest request when it is this flow's ICRC-2 approval, else null. */
export function approvalFor<F extends ApprovalReturnState["flow"]>(
  request: OdinRequestState | null,
  flow: F,
): {
  request: IcrcApproveRequest;
  returnState: Extract<ApprovalReturnState, { flow: F }>;
} | null {
  if (request?.action !== "icrc_approve") return null;
  const returnState = parseApprovalReturnState(request.returnState);
  if (returnState?.flow !== flow) return null;
  return {
    request,
    returnState: returnState as Extract<ApprovalReturnState, { flow: F }>,
  };
}

/**
 * Request ids already acted on during this page load. The follow-up to an
 * approval is a canister update call that moves funds, so it must run at
 * most once per approval even though a settled request stays in the SDK
 * state and effects re-run (StrictMode, remounts). Module scope so it
 * outlives any one component.
 */
const handledRequests = new Set<string>();

/** Claim a request id; false when it was already claimed. */
export function claimRequest(id: string): boolean {
  if (handledRequests.has(id)) return false;
  handledRequests.add(id);
  return true;
}
