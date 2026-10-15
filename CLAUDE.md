# CLAUDE.md — AI assistant guide for plinko

This file tells AI coding assistants how to work in this repository. Read it
before editing. Per-package rules live in `packages/frontend/AI_INSTRUCTIONS.md`.

The layout follows Toniq's `odin-app-template` (pnpm workspace + dfx). The
frontend is in place; the Azle app canister is planned as `packages/canister`.

## Project shape

```
packages/
  frontend/   # Vite + React Plinko game — Odin Connect auth + deposit UI
  canister/   # (planned) Azle canister — internal ledger for game balances
dfx.json      # frontend asset canister; the azle canister entry is added with it
```

Stack: React 19 + Vite 8 · TypeScript 6 strict · odin-connect 2.x · pnpm
workspace · Node 22+ · dfx.

## What you MAY modify freely

- Frontend UI, components, game engine, styling, copy
- README and docs
- Tooling/config, as long as `pnpm typecheck` and `pnpm build` stay green

## Rules that apply once `packages/canister` exists

The template's canister carries a hardened ledger core (`validateAmount`,
`credit`, `debit`) and checks-effects-interactions ordering in `withdraw` /
interaction-before-effect in `deposit`. Do not edit code between
`BEGIN/END HARDENED LEDGER CORE` markers or `⚠️ AI-GUARD` sections without
explicit maintainer sign-off. If a task seems to require it, stop and surface
it to a human.

## Invariants (never violate)

1. The canister, not the client, is the source of truth for balances. The UI
   displays and requests; it never assumes a transfer succeeded.
2. Money/amounts are `bigint` (ICRC-1 `Nat`) end-to-end; format to a display
   string only at the render edge. The in-memory game balance in
   `GameContext` is a `number` for play only and is replaced by the canister
   ledger later.
3. Canister ids and Odin env come from Vite env (`.env`, see `.env.example`),
   never string literals in `src/`.

## odin-connect 2.x

Render from state, never from an awaited call. The single `OdinConnect`
instance lives in `packages/frontend/src/odin/client.ts`; never `new
OdinConnect` elsewhere. `contexts/WalletContext.tsx` subscribes with
`useSyncExternalStore` and derives `connectedUser`, `isConnecting`,
`connectionError`, `request`. Start `connect()` and `user.<action>()` from
handlers with `void`; put the follow-up in an effect keyed on
`request.action` + `request.status` (+ a `returnState` tag). Value-moving
follow-ups run at most once per `request.id` (module-scope `Set`). Never call
`connect()` automatically on a `rejected` / `unverified` request. Keep the
default `mode: "auto"` so wallet in-app browsers work. See the SDK's
`node_modules/odin-connect/MIGRATION-2.0.md`.

## Conventions

- TypeScript strict. No `any`. Explicit return types on exported functions.
- 2-space indentation, double quotes, semicolons — match existing files.
- Conventional Commits for messages.

## Build / run

```sh
pnpm install                 # hoisted node-linker (.npmrc) — required later by Azle
cp packages/frontend/.env.example packages/frontend/.env
pnpm dev:frontend            # Vite dev server
pnpm typecheck
pnpm build                   # frontend dist

# Local replica (asset canister only, for now)
dfx start --clean --background
dfx deploy
```

CI (`.github/workflows/ci.yml`) runs typecheck and the frontend build on every
push/PR. Do not merge red.
