# CLAUDE.md — AI assistant guide for plinko

This file tells AI coding assistants how to work in this repository. Read it
before editing. Per-package rules live in `packages/frontend/AI_INSTRUCTIONS.md`.

The layout follows Toniq's `odin-app-template` (pnpm workspace + dfx).
Per-package rules: `packages/canister/AI_INSTRUCTIONS.md`,
`packages/frontend/AI_INSTRUCTIONS.md`.

## Project shape

```
packages/
  shared/     # pure TS — multiplier tables (x100), path → slot, payout math
  canister/   # Azle canister — internal ledger + house bankroll + on-chain bets
  frontend/   # Vite + React Plinko game — Odin Connect auth, deposit/withdraw, play
dfx.json      # canister (azle) + frontend (asset) canister config
```

Stack: Azle 0.33 (stable mode) · React 19 + Vite 8 · TypeScript strict ·
odin-connect 2.x · pnpm workspace (hoisted linker) · Node 22+ · dfx.

## What you MAY modify freely

- Frontend UI, components, ball animation, styling, copy
- README and docs
- Adding canister query/update endpoints that do not touch balance math
- Tests
- Tooling/config, as long as `pnpm typecheck`, `pnpm test` and `pnpm build`
  stay green

## What you MAY NOT modify without explicit maintainer sign-off

- The hardened ledger core in `packages/canister/src/ledger.ts` between the
  `BEGIN/END HARDENED LEDGER CORE` markers (`validateAmount`, `credit`,
  `debit`).
- The checks-effects-interactions ordering in `withdraw` / `withdrawHouse`
  (debit persisted before the transfer await, refund on failure) and the
  interaction-before-effect ordering in `deposit` / `fundHouse` (funds pulled
  before the credit) in `packages/canister/src/index.ts`.
- `play` and `playMany` must stay synchronous: no `await` between the bet
  debit and the payout credit, and the house-exposure check
  (`houseExposure` / `houseExposureMany`) stays before the draw. The ball cap
  is `MAX_BALLS_PER_DROP` in `packages/shared/src/index.ts`; raise it there
  (the Candid count is `Nat16`).
- The multiplier tables in `packages/shared/src/index.ts` (they set the house
  edge; `pnpm test` asserts 95-99 % return under a fair walk).
- The Odin ledger id is immutable after install: it is the `ledger_id` init
  argument validated by `packages/canister/src/odin_ledger.ts` and re-checked
  in `postUpgrade`. No setter; do not weaken `resolveUpgradeLedgerId`.

Guarded sections are marked `⚠️ AI-GUARD`. If a task seems to require touching
them, stop and surface it to a human.

## Invariants (never violate)

1. Every credited balance is backed by real funds: `deposit` / `fundHouse`
   are the only mint paths and credit only what `icrc2_transfer_from` already
   settled; `play` only pays out what the house bankroll plus the bet covers.
2. A withdrawal never exceeds the caller's internal balance; a bet never
   exceeds it either (`debit` rejects overdrafts).
3. Balances are unsigned and bounded; state mutations happen before
   cross-canister awaits; failures refund.
4. The canister, not the client, resolves bets. The frontend only replays the
   returned path. Amounts are `bigint` base units end-to-end; display strings
   only at the render edge (`packages/frontend/src/lib/amounts.ts`).
5. Canister ids, Odin env and the game token come from Vite env (`.env`, see
   `.env.example`), never string literals in `src/`. The frontend deposits
   and bets in `VITE_GAME_TOKEN_ID` only; the canister stays token-agnostic.

## odin-connect 2.x

Render from state, never from an awaited call. The single `OdinConnect`
instance lives in `packages/frontend/src/odin/client.ts`; never `new
OdinConnect` elsewhere. `contexts/WalletContext.tsx` subscribes with
`useSyncExternalStore`, builds the canister actor from the delegation
identity, and runs the deposit / withdraw follow-ups: an `icrc_approve`
request tagged with `returnState.flow` settles → `claimRequest(id)` →
`actor.deposit` / `actor.fundHouse` / `actor.withdraw`
(`src/odin/approvalFlow.ts`). The fund-house UI is shown to principals in
`VITE_HOUSE_ADMINS` and to the canister owner (`getOwner`); the endpoint
itself is open. Start
`connect()` and `user.icrcApprove()` from handlers with `void`. Never call
`connect()` automatically on a `rejected` / `unverified` request. Keep the
default `mode: "auto"` so wallet in-app browsers work. See the SDK's
`node_modules/odin-connect/MIGRATION-2.0.md`.

## Conventions

- TypeScript strict. No `any`. Explicit return types on exported functions.
- Frontend and shared: 2-space indentation, double quotes, semicolons.
  Canister: 4-space, single quotes (kept as in the template it was copied
  from). Match the file you are in.
- Keep pure logic (no IC runtime) in `packages/shared` or
  `packages/canister/src/game.ts` / `ledger.ts` so it stays unit-testable.
- Conventional Commits for messages.

## Build / test / deploy

```sh
pnpm install                 # hoisted linker (pnpm-workspace.yaml) — required by Azle
cp packages/frontend/.env.example packages/frontend/.env
pnpm typecheck               # frontend + shared tsc; canister types gated by Azle
pnpm test                    # vitest (shared tables, ledger core, bet resolution)
pnpm build                   # frontend dist + dfx build canister --check
pnpm dev:frontend            # Vite dev server

# Local replica
dfx start --clean --background
pnpm deploy:dev              # canister_dev with the Odin dev ledger init arg
dfx deploy frontend
# then copy CANISTER_ID_CANISTER_DEV from the root .env into
# packages/frontend/.env as VITE_APP_CANISTER_ID and set VITE_ODIN_ENV=dev
```

Two dfx canisters share `packages/canister/src/index.ts`: `canister` (prod
ledger `yspgd`, mainnet `zcbwm-eqaaa-aaaau-ahevq-cai`, `pnpm deploy:prod`) and
`canister_dev` (dev ledger `w5cxm`, mainnet `cs2c3-5yaaa-aaaau-ahgga-cai`,
`pnpm deploy:dev`). The frontend's `VITE_ODIN_ENV` must match the canister's
ledger. The prod canister predates the init argument: upgrade it only with
`deploy:prod`, never `deploy:dev` (see README "Odin ledger").

Deposits, withdrawals and `fundHouse` talk to the mainnet Odin ledger, so they
only work on `--network ic`. `play` needs a funded house (`fundHouse`).

CI (`.github/workflows/ci.yml`) runs typecheck, tests, the frontend build and
`dfx build canister --check` on every push/PR (same wasm as `canister_dev`).
Do not merge red.
