# plinko

Plinko game on **Odin Fun**: Odin Connect login, ICRC-2 deposit, play. Laid
out after [odin-app-template](https://github.com/Toniq-Labs/odin-app-template)
so an Azle app canister can be added as `packages/canister`.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 8, [odin-connect](https://www.npmjs.com/package/odin-connect) 2.x (state store)
- **Canister**: planned — Azle (TypeScript, Internet Computer)
- **Tooling**: pnpm workspace, dfx

## Layout

```
packages/
  frontend/   # Vite + React game — Odin Connect auth + deposit UI
  canister/   # (planned) Azle canister — internal ledger
dfx.json      # frontend asset canister
```

## Prerequisites

- [Node.js](https://nodejs.org) 22+ (see `.nvmrc`)
- [pnpm](https://pnpm.io) 10+
- [dfx](https://internetcomputer.org/docs/current/developer-docs/getting-started/install) 0.31+ (only for deploying the asset canister)

## Quick start

```sh
pnpm install
cp packages/frontend/.env.example packages/frontend/.env   # adjust env / canister id
pnpm dev:frontend
```

Deploy the frontend as an asset canister on a local replica:

```sh
pnpm build
dfx start --clean --background
dfx deploy
```

## Scripts

| Command               | Description                 |
| --------------------- | --------------------------- |
| `pnpm build`          | Build all workspace packages |
| `pnpm build:frontend` | Build the frontend           |
| `pnpm dev:frontend`   | Start the Vite dev server    |
| `pnpm typecheck`      | Type-check all packages      |

## Environment

`packages/frontend/.env` (see `.env.example`):

| Variable               | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `VITE_ODIN_APP_NAME`   | Name shown on the Odin approval page      |
| `VITE_ODIN_ENV`        | `prod` \| `dev` \| `local`                |
| `VITE_APP_CANISTER_ID` | ICRC-2 spender for deposits               |

## Next

Add `packages/canister` (Azle ledger from the template), wire the frontend to
it with a delegation-scoped connect, and move the game balance from memory to
the canister.
