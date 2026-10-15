# AI_INSTRUCTIONS — `@plinko/frontend`

Rules for working inside the frontend package. Read alongside the root
[`CLAUDE.md`](../../CLAUDE.md).

## What this package is

A Vite + React + TypeScript Plinko game: log in with Odin Connect, deposit a
token through an ICRC-2 approval, play.

```
src/
  main.tsx                 # React entry (GameProvider > WalletProvider > App)
  App.tsx                  # root component
  engine.js, constants.js  # physics + payout tables
  sounds.js
  odin/client.ts           # the single OdinConnect instance (env-configured)
  canister/config.ts       # APP_CANISTER_ID from Vite env
  contexts/WalletContext.tsx  # odin-connect state → React context
  contexts/GameContext.tsx    # in-memory game state (balance, bet, rows, risk)
  components/              # UI
index.html                 # Vite html entry
vite.config.ts             # outDir: dist → served by the dfx asset canister
```

## What you MAY change freely

- Components, hooks, layout, styling, copy, game tuning
- UI state, forms, validation, loading/error handling
- Frontend dependencies (keep the bundle reasonable)

## Hard rules

1. **Never trust the client for accounting.** Once the canister exists it is
   the source of truth for balances. Until then the game balance in
   `GameContext` is play-only and must not be presented as settled funds.
2. **Amounts are `bigint`** at the SDK boundary (`OdinUtils.convertToOdinAmount`,
   `icrcApprove.amount`). Convert to `number` only for display and game math.
3. **No hardcoded canister ids or env.** Read `APP_CANISTER_ID` from
   `src/canister/config.ts` and Odin env from `src/odin/client.ts`; both come
   from `.env` (`.env.example` documents the keys).
4. **Keep types honest.** Strict mode is on; no `any` or `// @ts-ignore`.
5. **odin-connect 2.x: render from state, never from an awaited call.** Use
   the instance in `src/odin/client.ts` (never `new OdinConnect` elsewhere)
   through `useWallet()`. Start `connect()` / `user.icrcApprove()` with `void`
   from handlers; react to `request.action` + `request.status` in effects,
   reading arguments from `request.input` / `request.returnState`. The deposit
   credit runs once per `request.id` (`handledDeposits` in `WalletContext`).
   Never auto-retry a `rejected` / `unverified` connect. Keep `mode: "auto"`.

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
