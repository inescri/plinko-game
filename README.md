# plinko

Plinko game on **Odin Fun**: Odin Connect login, ICRC-2 deposit into an app
canister, bets resolved on-chain, withdraw back to Odin. Laid out after
[odin-app-template](https://github.com/Toniq-Labs/odin-app-template).

## Stack

- **Canister**: [Azle](https://github.com/demergent-labs/azle) 0.33 (TypeScript, Internet Computer)
- **Frontend**: React 19 + TypeScript + Vite 8, [odin-connect](https://www.npmjs.com/package/odin-connect) 2.x (state store)
- **Tooling**: dfx, pnpm workspace

## Architecture

```mermaid
flowchart LR
    user([Player])
    fe["Frontend<br/>(React + Vite)"]
    oc["odin-connect SDK"]
    popup["Odin Fun<br/>approval (popup or redirect)"]
    can["App canister<br/>(Azle)"]
    ledger[("Internal ledger<br/>StableBTreeMap<br/>(owner|tokenId) → balance<br/>incl. owner = house")]
    odin["Odin ledger<br/>(one multiplexed ICRC ledger)"]

    user --> fe
    fe --> oc
    oc --> popup
    popup -->|icrc2_approve| odin
    fe -->|"deposit / withdraw / play / getBalances"| can
    can --> ledger
    can -->|"icrc2_transfer_from (deposit, fee)<br/>icrc1_transfer (withdraw)"| odin
```

**Deposit**: the player approves the app canister as an ICRC-2 spender through
the Odin approval page; once the approval result is in the odin-connect state,
the frontend calls `deposit` and the canister pulls the approved funds itself
(`icrc2_transfer_from`) and credits the player's internal balance. A credit is
only ever recorded for funds that actually settled.

**Play**: `play(token, bet, rows, risk)` debits the bet from the internal
balance, checks the house bankroll can cover the top payout, draws one random
bit per row from the canister's CSPRNG (seeded from the IC's `raw_rand`),
computes slot and payout with integer math, settles both the player and the
house, and returns the path. The frontend only animates that path; the landing
slot is the number of "right" steps. Multiplier tables live in
`packages/shared` and are the same source for the canister and the board
labels.

**Withdraw**: the player approves the BTC ledger fee; `withdraw` debits the
internal balance (persisted *before* the transfer await), pulls the fee, sends
the tokens back on the Odin ledger (`icrc1_transfer`), refunding the debit on
failure.

**House bankroll**: `fundHouse(token, amount)` is a permissionless deposit
into the `house` owner key. `getMaxBet` tells the frontend the largest bet the
bankroll covers; `play` enforces it. The deploying principal (`getOwner`) can
`withdrawHouse`.

## Layout

```
packages/
  shared/     # pure TS — multiplier tables (x100), path → slot, payout math
  canister/   # Azle canister — ledger, house bankroll, play
  frontend/   # Vite + React game — Odin Connect auth, deposit/withdraw, play
dfx.json      # canister (azle) + frontend (asset) canister config
```

## Prerequisites

- [Node.js](https://nodejs.org) 22+ (see `.nvmrc`)
- [pnpm](https://pnpm.io) 10+
- [dfx](https://internetcomputer.org/docs/current/developer-docs/getting-started/install) 0.31+
- [Rust](https://www.rust-lang.org/tools/install) + `wasm32-unknown-unknown` target (required by Azle)

```sh
rustup target add wasm32-unknown-unknown
```

## Quick start

```sh
pnpm install          # installs workspace deps + the azle dfx extension (if dfx is on PATH)
dfx start --clean --background
dfx deploy            # build + deploy canister and frontend
```

> If `pnpm install` ran before `dfx` was installed:
> `pnpm --filter @plinko/canister exec azle extension install`

Then point the frontend at the canister and start the dev server:

```sh
cp packages/frontend/.env.example packages/frontend/.env
# set VITE_APP_CANISTER_ID to CANISTER_ID_CANISTER from the root .env
pnpm dev:frontend
```

Deposits, withdrawals and `fundHouse` talk to the mainnet Odin ledger, so on a
local replica only the read endpoints and the validation paths of `play` can
be exercised; the full flow needs `--network ic`.

## Scripts

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `pnpm build`          | Frontend dist + `dfx build canister --check` |
| `pnpm build:canister` | Build the Azle canister                  |
| `pnpm build:frontend` | Build the frontend                       |
| `pnpm dev:frontend`   | Start the Vite dev server                |
| `pnpm typecheck`      | Type-check frontend + shared             |
| `pnpm test`           | Unit tests (tables, ledger core, bet resolution) |

## Environment

`packages/frontend/.env` (see `.env.example`):

| Variable               | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `VITE_ODIN_APP_NAME`   | Name shown on the Odin approval page                 |
| `VITE_ODIN_ENV`        | `prod` (the canister uses the prod Odin ledger)      |
| `VITE_APP_CANISTER_ID` | App canister id (spender + actor target)             |
| `VITE_DFX_NETWORK`     | `local` (fetches the root key) or `ic`               |
| `VITE_IC_HOST`         | Optional replica/boundary host override              |

## Canister API

| Endpoint                 | Kind   | Description                                                            |
| ------------------------ | ------ | ---------------------------------------------------------------------- |
| `deposit(token, amount)` | update | Pull pre-approved funds from the Odin ledger and credit the caller.    |
| `withdraw(token, amount)`| update | Debit the caller and send tokens back via the Odin ledger.             |
| `play(token, bet, rows, risk)` | update | Resolve one bet; returns `{ path, slot, multiplier_x100, payout, balance }`. |
| `fundHouse(token, amount)` | update | Pull pre-approved funds into the house bankroll (permissionless).    |
| `withdrawHouse(token, amount)` | update | Owner-only: move bankroll to the owner.                          |
| `getBalance(token)`      | query  | Caller's internal balance for one token.                               |
| `getBalances()`          | query  | All of the caller's `(token, balance)` pairs.                          |
| `getHouseBalance(token)` / `getHouseBalances()` | query | House bankroll.                                   |
| `getMaxBet(token, rows, risk)` | query | Largest bet the bankroll covers for that table.                  |
| `getOwner()`             | query  | The deploying principal.                                               |
| `icrc28_trusted_origins` | update | ICRC-28 trusted origins — the web origins allowed to request signed calls. |

> **ICRC-28 / Odin Connect auth:** `TRUSTED_ORIGINS` in
> [`packages/canister/src/index.ts`](packages/canister/src/index.ts) lists
> `http://localhost:5173` and `:5174` only. **Add the deployed frontend
> origin before going live** (bare `scheme://host[:port]`, exact match) or
> login fails. The endpoint must stay `update` so the signer gets a certified
> reply.

Tokens are identified by their **Odin token id** (text); every Odin token
shares one ledger and is addressed by subaccount (`odin_token_pointer`).
Balances are keyed by `(owner, tokenId)` in stable memory, so they survive
upgrades. `rows` is one of 8, 10, 12, 14, 16; `risk` is `low`, `medium` or
`high`. Bets and balances are base units (`bigint`).

### Withdrawal fees

The Odin ledger charges a flat BTC fee to the sender on every transfer. On
withdraw the sender is the app canister, so the canister pays that fee in BTC.
The **withdrawer pays**: the frontend first requests an ICRC-2 BTC approval
(token `"btc"`) for **2× the fee**; `withdraw` pulls the fee from the caller's
BTC, then sends the tokens. The pulled BTC funds the outbound transfer's fee,
so on success the canister nets zero and needs no float. If the token send
fails after the fee pull, the fee is forfeited (not refunded). Why 2×: the
pull is itself a transfer and the ledger charges the caller a fee on it too.
See `ODIN_BTC_FEE` in
[`packages/canister/src/odin.ts`](packages/canister/src/odin.ts) and
[`packages/frontend/src/lib/fees.ts`](packages/frontend/src/lib/fees.ts).
Confirm it matches the live ledger fee before going live.

## Deploy to mainnet

1. Fund your identity with cycles (`dfx identity get-principal`).
2. `pnpm build && dfx deploy --network ic`. The deploying principal becomes
   the owner.
3. Put the canister id in `packages/frontend/.env` (`VITE_APP_CANISTER_ID`,
   `VITE_DFX_NETWORK=ic`), add the frontend origin to `TRUSTED_ORIGINS`,
   redeploy the canister. Verify:
   `dfx canister call canister icrc28_trusted_origins '()' --network ic`.
4. Fund the house: approve the canister as spender for the token on Odin,
   then `dfx canister call canister fundHouse '("<token>", <amount>)' --network ic`
   (or call it from any delegated session). `getMaxBet` is `0` until then.
