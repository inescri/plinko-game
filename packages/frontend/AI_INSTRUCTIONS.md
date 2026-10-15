# AI_INSTRUCTIONS — `@plinko/frontend`

Rules for working inside the frontend package. Read alongside the root
[`CLAUDE.md`](../../CLAUDE.md).

## What this package is

A Vite + React + TypeScript Plinko game: log in with Odin Connect (delegation
scoped to the app canister), deposit a token through an ICRC-2 approval, bet
from the internal balance, withdraw.

```
src/
  main.tsx                 # React entry (GameProvider > WalletProvider > App)
  App.tsx                  # root component
  engine.ts, constants.ts  # scripted ball animation along the canister's path
  sounds.js
  odin/client.ts           # the single OdinConnect instance (env-configured)
  odin/approvalFlow.ts     # returnState tags + claimRequest for approvals
  canister/config.ts       # APP_CANISTER_ID / network from Vite env
  canister/idl.ts          # hand-maintained Candid interface (must match the canister)
  canister/actor.ts, useCanisterActor.ts  # typed actor from the delegation identity
  contexts/WalletContext.tsx  # odin-connect state, actor, deposit/withdraw follow-ups
  contexts/GameContext.tsx    # game state: token, bigint balance/bet, rows, risk
  hooks/usePlay.ts         # actor.play → canvas.spawnBall
  lib/amounts.ts, fees.ts  # bigint ↔ display conversion, withdraw fee constants
  components/              # UI
index.html                 # Vite html entry
vite.config.ts             # outDir: dist → served by the dfx asset canister
```

## What you MAY change freely

- Components, hooks, layout, styling, copy, game tuning
- UI state, forms, validation, loading/error handling
- Frontend dependencies (keep the bundle reasonable)

## Hard rules

1. **Never trust the client for accounting.** The canister resolves every
   bet and owns every balance. The UI starts calls and replays results; the
   optimistic debit in `BET_STARTED` is replaced by the canister's answer.
   Keep `engine.ts` free of outcome logic: the landing slot is
   `slotFromPath(path)` from `@plinko/shared`, never a physics result.
2. **Amounts are `bigint`** base units end-to-end (`GameContext`, actor
   calls, `icrcApprove.amount`). Convert to strings only for display via
   `lib/amounts.ts`. Multiplier tables come from `@plinko/shared`; do not
   add a local copy.
3. **No hardcoded canister ids or env.** Read `APP_CANISTER_ID` from
   `src/canister/config.ts` and Odin env from `src/odin/client.ts`; both come
   from `.env` (`.env.example` documents the keys).
4. **Keep types honest.** Strict mode is on; no `any` or `// @ts-ignore`.
5. **odin-connect 2.x: render from state, never from an awaited call.** Use
   the instance in `src/odin/client.ts` (never `new OdinConnect` elsewhere)
   through `useWallet()`. Start `connect()` / `user.icrcApprove()` with `void`
   from handlers; react to `request.action` + `request.status` in effects,
   reading arguments from `request.input` / `request.returnState`. The
   canister `deposit` / `withdraw` follow-ups run once per `request.id`
   (`claimRequest` in `odin/approvalFlow.ts`, claimed before the await).
   Never auto-retry a `rejected` / `unverified` connect. Keep `mode: "auto"`.
6. **`canister/idl.ts` mirrors the canister.** When an endpoint changes in
   `packages/canister/src/index.ts`, update the IDL factory and the
   `CanisterActor` type together.

## Conventions

- Function components + hooks. 2-space indentation, double quotes, semicolons.
- Keep `App.tsx` thin; extract flows into components/contexts as they grow.

## Build & test

```sh
pnpm --filter @plinko/frontend dev
pnpm --filter @plinko/frontend build      # tsc --noEmit && vite build → dist/
pnpm --filter @plinko/frontend typecheck
```

Keep `pnpm build:frontend` and `pnpm typecheck` green — CI runs both.
